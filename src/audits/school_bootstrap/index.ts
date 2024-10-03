import {auditDictionary} from "../../storage/auditDictionary.js";
import {
    errorHandling,
    notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import {DataElementError} from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";

const auditId = "school-ux-ui-consistency-bootstrap-italia-double-check";
const auditData = auditDictionary[auditId];
import { compareVersions } from "compare-versions";
import { cssClasses } from "./cssClasses.js";

class SchoolBootstrap extends Audit {
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
    public correctItems: any = [];
    public pagesInError : any = [];
    public score = 1;
    private titleSubHeadings: any = [];
    private headings : any = [];

    static get meta() {
        return {
            id: auditId,
            title: auditData.title,
            failureTitle: auditData.failureTitle,
            description: auditData.description,
            scoreDisplayMode: Audit.SCORING_MODES.BINARY,
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
                "La libreria Bootstrap Italia è presente",
                "Versione in uso",
                "Classi CSS trovate",
            ];

            const subResults = ["Nessuna", "Almeno una"];

            this.headings = [
                {
                    key: "result",
                    itemType: "text",
                    text: "Risultato totale",
                    subItemsHeading: { key: "inspected_page", itemType: "url" },
                },
                {
                    key: "title_library_name",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "library_name", itemType: "text" },
                },
                {
                    key: "title_library_version",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "library_version", itemType: "text" },
                },
                {
                    key: "title_classes_found",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "classes_found", itemType: "text" },
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

            let singleResult = 0;
            const item = {
                inspected_page: url,
                library_name: "No",
                library_version: "",
                classes_found: "",
            };

            const foundClasses = [];
            try {
                let bootstrapItaliaVariableVersion = await page.evaluate(
                    async function () {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        //@ts-ignore
                        return window.BOOTSTRAP_ITALIA_VERSION || null;
                    }
                ) as string|null;

                if (bootstrapItaliaVariableVersion !== null)
                    bootstrapItaliaVariableVersion = bootstrapItaliaVariableVersion
                        .trim()
                        .replaceAll('"', "");

                let bootstrapItaliaSelectorVariableVersion = await page.evaluate(
                    async function () {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        //@ts-ignore
                        return (
                            getComputedStyle(document.body).getPropertyValue(
                                "--bootstrap-italia-version"
                            ) || null
                        );
                    }
                ) as string|null;

                if (bootstrapItaliaSelectorVariableVersion !== null)
                    bootstrapItaliaSelectorVariableVersion =
                        bootstrapItaliaSelectorVariableVersion.trim().replaceAll('"', "");

                if (
                    bootstrapItaliaVariableVersion !== null &&
                    bootstrapItaliaVariableVersion
                ) {
                    item.library_version = bootstrapItaliaVariableVersion;
                    item.library_name = "Sì";

                    if (compareVersions(bootstrapItaliaVariableVersion, "1.6.0") >= 0) {
                        singleResult = 1;
                    }
                } else if (
                    bootstrapItaliaSelectorVariableVersion !== null &&
                    bootstrapItaliaSelectorVariableVersion
                ) {
                    item.library_version = bootstrapItaliaSelectorVariableVersion;
                    item.library_name = "Sì";

                    if (
                        compareVersions(bootstrapItaliaSelectorVariableVersion, "1.6.0") >= 0
                    ) {
                        singleResult = 1;
                    }
                }

                for (const cssClass of cssClasses) {
                    const elementCount = await page.evaluate(async (cssClass) => {
                        const cssElements = document.querySelectorAll(`.${cssClass}`);
                        return cssElements.length;
                    }, cssClass);

                    if (elementCount > 0) {
                        foundClasses.push(cssClass);
                    }
                }
            } catch (ex) {
                console.error(`ERROR ${url}: ${ex}`);
                if (!(ex instanceof Error)) {
                    throw ex;
                }

                this.pagesInError.push({
                    inspected_page: url,
                    library_name: ex.message,
                });
            }

            if (foundClasses.length === 0) {
                singleResult = 0;
                item.classes_found = subResults[0];
            } else {
                item.classes_found = subResults[1];
            }

            if (singleResult === 1) {
                this.correctItems.push(item);
            } else {
                this.score = 0;
                this.wrongItems.push(item);
            }

            console.log(`Results: ${JSON.stringify(this.globalResults)}`);

            return {
                score: this.score,
            };
        }
    }

    async getType(){
        return auditId;
    }

    async returnGlobal() {
        if(this.globalResults.details.items.length){
            this.globalResults.details.items.unshift({
                result: (this.constructor as typeof Audit).auditData.redResult,
            })
            return this.globalResults;
        }
        switch (this.score) {
            case 1:
                this.globalResults['details']['items'].push({
                    result: auditData.greenResult,
                });
                break;
            case 0:
                this.globalResults['details']['items'].push({
                    result: auditData.redResult,
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
                result: auditData.subItem.redResult,
                title_library_name: this.titleSubHeadings[0],
                title_library_version: this.titleSubHeadings[1],
                title_classes_found: this.titleSubHeadings[2],
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

        if (this.correctItems.length > 0) {
            results.push({
                result: auditData.subItem.greenResult,
                title_library_name: this.titleSubHeadings[0],
                title_library_version: this.titleSubHeadings[1],
                title_classes_found: this.titleSubHeadings[2],
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

    static getInstance(): Promise<SchoolBootstrap> {
        if (!SchoolBootstrap.instance) {
            SchoolBootstrap.instance = new SchoolBootstrap('', [], []);
        }
        return SchoolBootstrap.instance;
    }
}


export {SchoolBootstrap};
export default SchoolBootstrap.getInstance;
