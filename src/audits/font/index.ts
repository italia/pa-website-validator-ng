import {
    errorHandling,
    notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import {DataElementError} from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import { allowedFonts } from './allowedFonts.js'

type BadElement = [string[], boolean]; // First value is element snippet, second is whether it is tolerable

class FontAudit extends Audit {
    public globalResults: any = {
        score: 1,
        details: {
            items: [],
            type: 'table',
            headings: [],
            summary: ''
        },
        errorMessage: ''
    };
    public wrongItems: any = [];
    public toleranceItems: any = [];
    public correctItems: any = [];
    public pagesInError : any = [];
    public score = 1;
    private titleSubHeadings: any = [];
    private headings : any = [];

    static allowedFonts = allowedFonts;
    static get meta() {
        return {
            id: this.auditId,
            title: this.auditData.title,
            failureTitle: this.auditData.failureTitle,
            description: this.auditData.description,
            scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
            requiredArtifacts: ["origin"],
        };
    }

    async auditPage(
        page: Page | null,
        error?: string,
    ) {

        if (error && !page) {
            this.globalResults['score'] = 0;
            this.globalResults['details']['items'] =  [
                {
                    result: notExecutedErrorMessage.replace("<LIST>", error),
                },
            ];
            this.globalResults['details']['type'] = 'table';
            this.globalResults['details']['headings'] = [{key: "result", itemType: "text", text: "Risultato"}];
            this.globalResults['details']['summary'] = '';

            return {
                score: 0,
            }
        }

        if (page) {
            this.titleSubHeadings = [
                "Numero di <h> o <p> con font errati",
                "Font errati individuati",
            ];

            this.headings = [
                {
                    key: "result",
                    itemType: "text",
                    text: "Risultato",
                    subItemsHeading: { key: "inspected_page", itemType: "url" },
                },
                {
                    key: "title_wrong_number_elements",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "wrong_number_elements", itemType: "text" },
                },
                {
                    key: "title_wrong_fonts",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "wrong_fonts", itemType: "text" },
                },
            ];

            let url = '';

            try {
                url = page.url();
            } catch (ex) {
                if (!(ex instanceof DataElementError)) {
                    throw ex;
                }

                let errorMessage = ex.message;
                errorMessage = errorMessage.substring(
                    errorMessage.indexOf('"') + 1,
                    errorMessage.lastIndexOf('"')
                );

                this.pagesInError.push({
                    inspected_page: url,
                    wrong_order_elements: "",
                    missing_elements: errorMessage,
                });

                return {
                    score: 0,
                }
            }

            const item = {
                inspected_page: url,
                wrong_fonts: "",
                wrong_number_elements: 0,
            };

            const badElements: Array<BadElement> = await page.evaluate(
                (requiredFonts) => {
                    const badElements: Array<BadElement> = [];
                    const outerElems = window.document.body.querySelectorAll(
                        "h1, h2, h3, h4, h5, h6, p"
                    );

                    const wrongFonts = (e: Element) => {
                        const elementFonts = window
                            .getComputedStyle(e)
                            .fontFamily.split(",", 1)
                            .map((s) => s.replace(/^"|"$/g, ""));
                        return elementFonts.filter((x) => !requiredFonts.includes(x));
                    };

                    for (const e of outerElems) {
                        const elementWrongFonts = wrongFonts(e);
                        if (elementWrongFonts.length > 0) {
                            badElements.push([elementWrongFonts, false]);
                            continue;
                        }

                        const children = [...e.querySelectorAll("*")];
                        for (const child of children) {
                            const wrongFontChild = wrongFonts(child);
                            if (wrongFontChild.length > 0) {
                                badElements.push([wrongFontChild, true]);
                                break;
                            }
                        }
                    }
                    return badElements;
                },
                (this.constructor as typeof FontAudit).allowedFonts
            );

            if (badElements.length === 0) {
                this.correctItems.push(item);
                return {
                    score: this.score,
                };
            }

            const reallyBadElements = badElements.filter((e) => !e[1]);

            const wrongFontsUnique = (arrays: Array<BadElement>) => {
                const arrayUnique = (array: string[]) => {
                    const a = array.concat();
                    for (let i = 0; i < a.length; ++i) {
                        for (let j = i + 1; j < a.length; ++j) {
                            if (a[i] === a[j]) a.splice(j--, 1);
                        }
                    }
                    return a;
                };

                let arrayMerged: string[] = [];
                for (const array of arrays) {
                    arrayMerged = arrayMerged.concat(array[0]);
                }
                return arrayUnique(arrayMerged);
            };

            if (reallyBadElements.length > 0) {
                if (this.score > 0) {
                    this.score = 0;
                }
                item.wrong_fonts = wrongFontsUnique(reallyBadElements).join(", ");
                item.wrong_number_elements = reallyBadElements.length;
                this.wrongItems.push(item);
                return {
                    score: this.score,
                };
            }

            if (this.score > 0.5) {
                this.score = 0.5;
            }
            item.wrong_fonts = wrongFontsUnique(badElements).join(", ");
            item.wrong_number_elements = badElements.length;
            this.toleranceItems.push(item);

            console.log(`Results: ${JSON.stringify(this.globalResults)}`);

            return {
                score: this.score,
            };
        }
    }

    async getType(){
        return (this.constructor as typeof Audit).auditId;
    }

    async returnGlobal() {
        switch (this.score) {
            case 1:
                this.globalResults['details']['items'].push({
                    result: (this.constructor as typeof Audit).auditData.greenResult,
                });
                break;
            case 0.5:
                this.globalResults['details']['items'].push({
                    result: (this.constructor as typeof Audit).auditData.yellowResult,
                });
                break;
            case 0:
                this.globalResults['details']['items'].push({
                    result: (this.constructor as typeof Audit).auditData.redResult,
                });
                break;
        }

        const results = [];

        if (this.pagesInError.length) {
            results.push({
                result: errorHandling.errorMessage,
            });

            results.push({});

            results.push({
                result: errorHandling.errorColumnTitles[0],
                title_missing_elements: errorHandling.errorColumnTitles[1],
                title_wrong_order_elements: "",
            });


            for (const item of this.pagesInError) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }
        }

        results.push({});

        if (this.wrongItems.length > 0) {
            results.push({
                result: (this.constructor as typeof Audit)?.auditData?.subItem?.redResult ?? '',
                title_wrong_number_elements: this.titleSubHeadings[0],
                title_wrong_fonts: this.titleSubHeadings[1],
            });

            for (const item of this.wrongItems) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            results.push({});
        }

        if (this.toleranceItems.length > 0) {
            results.push({
                result: (this.constructor as typeof Audit)?.auditData?.subItem?.yellowResult ?? '',
                title_wrong_number_elements: this.titleSubHeadings[0],
                title_wrong_fonts: this.titleSubHeadings[1],
            });

            for (const item of this.toleranceItems) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            results.push({});
        }

        if (this.correctItems.length > 0) {
            results.push({
                result: (this.constructor as typeof Audit)?.auditData?.subItem?.greenResult ?? '',
                title_wrong_number_elements: this.titleSubHeadings[0],
                title_wrong_fonts: this.titleSubHeadings[1],
            });

            for (const item of this.correctItems) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            results.push({});
        }

        this.globalResults.errorMessage =  this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
        this.globalResults.details.items = results;
        this.globalResults.details.headings = this.headings;
        this.globalResults.score = this.score;

        return this.globalResults;
    }

    static getInstance(): Promise<FontAudit> {
        if (!FontAudit.instance) {
            FontAudit.instance = new FontAudit('', [], []);
        }
        return FontAudit.instance;
    }
}


export {FontAudit};
export default FontAudit.getInstance;
