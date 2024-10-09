import {
    errorHandling,
} from "../../config/commonAuditsParts.js";
import {Audit} from "../Audit.js";
import puppeteer, {Browser, Page} from "puppeteer";
import crawlerTypes from "../../types/crawler-types";
import cookie = crawlerTypes.cookie;
import {gotoRetry} from "../../utils/utils.js";
import * as dotenv from 'dotenv';
import * as process from 'process';
dotenv.config();

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

    private oldPuppeteerBrowser:Browser|null = null;
    constructor(id: string, gathererPageType: string[], auditsIds: string[]) {
        super(id, gathererPageType, auditsIds);
    }

    async meta() {
        return {
            id: this.auditId,
            title: this.auditData.title,
            failureTitle: this.auditData.title,
            scoreDisplayMode: this.SCORING_MODES.BINARY,
            description: this.auditData.description,
            requiredArtifacts: ["origin"],
        };
    }

    async auditPage(
        page: Page | null,
        error?: string,
        pageType?: string | null,
    ) {
        if(!this.oldPuppeteerBrowser){
            this.oldPuppeteerBrowser = await puppeteer.launch({
                headless: true,
                executablePath: process.env?.OLD_PUPPETEER_BROWSER_PATH ?? ''
            });
        }

        this.titleSubHeadings = [
            "Dominio del cookie",
            "Nome del cookie",
            "Valore del cookie",
        ];

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

        if (error && !page && pageType !== 'event') {

            this.score = 0;

            this.pagesInError.push({
                inspected_page: 'url',
                cookie_domain: error,
            });

            return {
                score: 0,
            }
        }

        if (page) {

            let url = page.url();

            try {
                const items = [];
                let score = 1;

                const oldPage = await this.oldPuppeteerBrowser.newPage()

                await gotoRetry(oldPage, url, errorHandling.gotoRetryTentative);

                let cookies = await oldPage.cookies();

                console.log(cookies);

                const resultCookies = await checkCookieDomain(url, cookies);

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

            return {
                score: this.score,
            };
        }
    }

    async getType(){
        return this.auditId;
    }

    async returnGlobal() {
        switch (this.score) {
            case 1:
                this.globalResults['details']['items'].push({
                    result: this.auditData.greenResult,
                });
                break;
            case 0:
                this.globalResults['details']['items'].push({
                    result: this.auditData.redResult,
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
                title_cookie_domain: errorHandling.errorColumnTitles[1],
                title_cookie_name: "",
                title_cookie_value: "",
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
                result: this.auditData?.subItem?.redResult ?? '',
                title_cookie_domain: this.titleSubHeadings[0],
                title_cookie_name: this.titleSubHeadings[1],
                title_cookie_value: this.titleSubHeadings[2],
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
                result: this.auditData?.subItem?.greenResult ?? '',
                title_cookie_domain: this.titleSubHeadings[0],
                title_cookie_name: this.titleSubHeadings[1],
                title_cookie_value: this.titleSubHeadings[2],
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
        this.globalResults.id = this.auditId;

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
    cookies: any
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
