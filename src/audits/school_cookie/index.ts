import {auditDictionary} from "../../storage/auditDictionary.js";
import {
    errorHandling,
    notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import {DataElementError} from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import {CookieAudit} from "../../common_audit_logics/cookieAuditLogic.js";

const auditId = "school-legislation-cookie-domain-check";
const auditData = auditDictionary[auditId];

class SchoolCookie extends Audit {
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
            id: auditId,
            title: auditData.title,
            failureTitle: auditData.title,
            scoreDisplayMode: Audit.SCORING_MODES.BINARY,
            description: auditData.description,
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
                const pageResult = await CookieAudit(page);

                if (pageResult.score < this.score) {
                    this.score = pageResult.score;
                }

                for (const item of pageResult.items) {
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
        return auditId;
    }

    async returnGlobal() {
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

    static getInstance(): Promise<SchoolCookie> {
        if (!SchoolCookie.instance) {
            SchoolCookie.instance = new SchoolCookie('', [], []);
        }
        return SchoolCookie.instance;
    }
}


export {SchoolCookie};
export default SchoolCookie.getInstance;
