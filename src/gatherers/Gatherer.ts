import puppeteer, { HTTPResponse, JSHandle, Page } from "puppeteer";
import { browser } from '../PuppeteerInstance.js'
import PageManager from "../PageManager.js"

interface PageData {
    id: string;
    url: string;
  }

export abstract class Gatherer {
    id: string;
    gathererPageType: string[];
    auditsIds: string[];
    protected timeout: number = 30000;

    constructor(id: string, gathererPageType: string[], auditsIds: string[]) {
        this.id = id;
        this.gathererPageType = gathererPageType;
        this.auditsIds = auditsIds;
    }

    abstract navigateAndFetchPages(url: string, pagesToBeAnalyzed: any[], id: string): Promise<PageData[]>;

    async gotoRetry( page: Page, url: string, retryCount: number): Promise<any | null> {
        try {
            let response = await page.goto(url, {
                waitUntil: ["load", "networkidle0"],
                timeout: this.timeout,
            });

            try {
                await page.evaluate(async () => {
                    return window;
                });
            } catch (e) {

                console.log('context destriyed 1')
                try {
                    response = await page.goto(url, {
                        waitUntil: ["load", "networkidle0"],
                        timeout: this.timeout,
                    });

                    await page.reload({
                        waitUntil: ["load", "networkidle0"],
                        timeout: this.timeout,
                    });

                    await page.evaluate(async () => {
                        return window;
                    });
                } catch (e) {
                    console.log('context destriyed 2')
                    await page.goto(url, {
                        waitUntil: ["load", "networkidle0"],
                        timeout: this.timeout,
                    });

                    response = await page.waitForNavigation({
                        waitUntil: ["load", "networkidle0"],
                        timeout: this.timeout,
                    });
                }
            }

            return response;
        } catch (error) {
            console.log('')
            if (retryCount <= 0) {
                throw error;
            }
            console.log(
                `${url} goto tentative:  ${retryCount}`
            );
            return await this.gotoRetry(page, url, retryCount - 1);
        }
    };

    async loadPageData(url: string): Promise<any> {
        try {
            const page = await browser.newPage();

            await page.setRequestInterception(true);
            await page.on("request", (request: any) => {
                if (
                    ["image", "imageset", "media"].indexOf(request.resourceType()) !== -1 ||
                    new URL(request.url()).pathname.endsWith(".pdf")
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            const res = await this.gotoRetry(page, url, 3);
            console.log(res?.url(), res?.status());

            return page
        } catch (ex) {
            console.error(`ERROR ${url}: ${ex}`);
            await browser.close();
            throw new Error(
                `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`
            );
        }
    };

    async getHREFValuesDataAttribute( page: Page, elementDataAttribute: string ): Promise<any[]> {
        const serviceUrls = [];

        const element = await page.$(elementDataAttribute);

        if (element) {
            const href = await element.getProperty('href');
            if (href) {
                const hrefValue = await href.jsonValue();
                serviceUrls.push(hrefValue)
            } else {
                console.log('The element does not have an href attribute');
            }
        } else {
            console.log('No element found with the data-element attribute');
        }

        return serviceUrls;
    };

    async getChildrenFromJSHandle(jsHandle: JSHandle) {
        const children = await jsHandle.getProperties();
        const childElements = [];

        console.log(children)
        for (const property of children.values()) {
            const element = property.asElement();
            if (element) {
                childElements.push(element);
            }
        }

        return childElements;
    }
}