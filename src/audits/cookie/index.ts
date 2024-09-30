import {auditDictionary} from "../../storage/auditDictionary.js";
import {
    errorHandling,
    notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import {DataElementError} from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Cookie, Page} from "puppeteer";
import crawlerTypes from "../../types/crawler-types";
import cookie = crawlerTypes.cookie;
class CookieAudit extends Audit {
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
    static get meta() {
        return {
            id: this.auditId,
            title: this.auditData.title,
            failureTitle: this.auditData.title,
            scoreDisplayMode: Audit.SCORING_MODES.BINARY,
            description: this.auditData.description,
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
                "Dominio del cookie",
                "Nome del cookie",
                "Valore del cookie",
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
                    key: "title_cookie_domain",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "cookie_domain", itemType: "text" },
                },
                {
                    key: "title_cookie_name",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "cookie_name", itemType: "text" },
                },
                {
                    key: "title_cookie_value",
                    itemType: "text",
                    text: "",
                    subItemsHeading: { key: "cookie_value", itemType: "text" },
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

            try {
                const items = [];
                let score = 1;

                let cookies: Cookie[] = await page.cookies();
                const resultCookies = await checkCookieDomain(page.url(), cookies);

                for (const resultCookie of resultCookies) {
                    if (!resultCookie.is_correct) {
                        score = 0;
                    }

                    items.push(resultCookie);
                }

                if (score < this.score) {
                    this.score = score;
                }

                for (const item of items) {
                    if (item.is_correct) {
                        this.correctItems.push(item);
                    } else {
                        this.wrongItems.push(item);
                    }
                }
            } catch (ex) {
                if (!(ex instanceof Error)) {
                    throw ex;
                }

                let errorMessage = ex.message;
                errorMessage = errorMessage.substring(
                    errorMessage.indexOf('"') + 1,
                    errorMessage.lastIndexOf('"')
                );

                this.pagesInError.push({
                    inspected_page: url,
                    cookie_domain: errorMessage,
                });
            }

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
                result: (this.constructor as typeof Audit)?.auditData?.subItem?.greenResult ?? '',
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

    static getInstance(): Promise<CookieAudit> {
        if (!CookieAudit.instance) {
            CookieAudit.instance = new CookieAudit('', [], []);
        }
        return CookieAudit.instance;
    }
}


export {CookieAudit};
export default CookieAudit.getInstance;

async function checkCookieDomain(
    url: string,
    cookies: Cookie[]
): Promise<cookie[]> {
    const returnValue = [];

    for (const cookie of cookies) {
        const cookieValues = {
            inspected_page: url,
            cookie_name: cookie.name,
            cookie_value: cookie.value,
            cookie_domain: cookie.domain,
            is_correct: false,
        };

        const pageUrl = new URL(url).hostname.replaceAll("www.", "");

        if (
            pageUrl === cookie.domain.replaceAll("www.", "") ||
            cookie.domain.endsWith("." + pageUrl)
        ) {
            cookieValues.is_correct = true;
        }

        returnValue.push(cookieValues);
    }

    return returnValue;
}
