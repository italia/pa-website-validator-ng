import {
    errorHandling,
} from "../../config/commonAuditsParts.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import crawlerTypes from "../../types/crawler-types";
import cookie = crawlerTypes.cookie;
import * as ejs from "ejs";
import {gotoRetry} from "../../utils/utils.js";
import {oldBrowser} from "../../PuppeteerInstance.js";


class CookieAudit extends Audit {
    public globalResults: any = {
        score: 1,
        details: {
            items: [],
            type: 'table',
            headings: [],
            summary: ''
        },
        generalMessage: '',
        pagesInError: {
            message: '',
            headings: [],
            pages: []
        },
        wrongPages: {
            message: '',
            headings: [],
            pages: []
        },
        tolerancePages: {
            message: '',
            headings: [],
            pages: []
        },
        correctPages: {
            message: '',
            headings: [],
            pages: []
        },
        errorMessage: '',
    };
    public wrongItems: any = [];
    public correctItems: any = [];
    public pagesInError : any = [];
    public score = 1;
    private titleSubHeadings: any = [];
    private headings : any = [];

    async meta() {
        return {
            id: this.auditId,
            code: this.code,
            title: this.auditData.title,
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
                link: 'url',
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

                const oldPage = await oldBrowser.newPage()

                await gotoRetry(oldPage, url, errorHandling.gotoRetryTentative);

                let cookies = await oldPage.cookies();

                await oldPage.close();

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
                        this.correctItems.push({link: item.link, cookie_domain: item.cookie_domain, cookie_name: item.cookie_name, cookie_value: item.cookie_value});
                    } else {
                        this.wrongItems.push({link: item.link, cookie_domain: item.cookie_domain, cookie_name: item.cookie_name, cookie_value: item.cookie_value});
                    }
                }
                this.pagesInError.push({link: 'https://www.google.com/', cookie_domain: 'ciao', cookie_name: 'mondo', cookie_value: 'hello'})
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
                    link: url,
                    cookie_domain: errorMessage,
                    cookie_name: '',
                    cookie_value: ''
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
        this.globalResults.correctPages.pages = [];
        this.globalResults.tolerancePages.pages = [];
        this.globalResults.wrongPages.pages = [];
        this.globalResults.pagesInError.pages = [];

        switch (this.score) {
            case 1:
                results.push({
                    result: this.auditData.greenResult,
                });
                this.globalResults.generalMessage = this.auditData.greenResult;
                break;
            case 0:
                results.push({
                    result: this.auditData.redResult,
                });
                this.globalResults.generalMessage = this.auditData.redResult;
                break;
        }

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

            this.globalResults.pagesInError.message = errorHandling.errorMessage
            this.globalResults.pagesInError.headings = [errorHandling.errorColumnTitles[0], errorHandling.errorColumnTitles[1]];


            for (const item of this.pagesInError) {
                this.globalResults.pagesInError.pages.push(item);

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

            this.globalResults.wrongPages.message = [this.auditData?.subItem?.redResult ?? '', this.titleSubHeadings[0], this.titleSubHeadings[1], this.titleSubHeadings[2]];

            for (const item of this.wrongItems) {
                this.globalResults.wrongPages.pages.push(item);
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

            this.globalResults.correctPages.headings = [this.auditData?.subItem?.greenResult ?? '', this.titleSubHeadings[0], this.titleSubHeadings[1], this.titleSubHeadings[2]];

            for (const item of this.correctItems) {
                this.globalResults.correctPages.pages.push(item);
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

    async returnGlobalHTML() {
        let status = 'fail'
        let message = ''

        if (this.score > 0.5) {
            status = 'pass';
            message = this.auditData.greenResult;
        } else {
            status = 'fail';
            message = this.auditData.redResult
        }

        const reportHtml = await ejs.renderFile('src/audits/municipality_cookie/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults, status, statusMessage: message, metrics: null ,  totalPercentage : null });
        return reportHtml
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
            link: url,
            cookie_domain: cookie.domain,
            cookie_name: cookie.name,
            cookie_value: cookie.value,
            is_correct: false
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
