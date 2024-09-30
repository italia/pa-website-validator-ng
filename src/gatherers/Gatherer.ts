import { JSHandle, Page } from "puppeteer";
import crawlerTypes from "../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {loadPage} from "../utils/utils.js";

abstract class Gatherer {
    id: string;
    timeout: number;
    gatheredPages: PageData[]
    protected static instance: any;
    static pageType: string
    static dataElements: string[]

    protected constructor( id: string, timeout = 30000) {
        this.id = id;
        this.timeout = timeout
        this.gatheredPages = []
    }

    async createGatherer(id: string, gathererPageType: string[], auditsIds: string[]) {
        return this.constructor(id, gathererPageType, auditsIds);
    }

    async navigateAndFetchPages(url: string, numberOfPages = 5, website: string = '', page: Page): Promise<PageData[]> {
        if (this.gatheredPages.length > 0) {
            return this.gatheredPages
        }

        const randomPagesUrl = await this.getRandomPagesUrl(url, numberOfPages)

        const currentClass = this.constructor as typeof Gatherer
        this.gatheredPages = randomPagesUrl.map(url => {
            return {
                url: url,
                id: currentClass.pageType + Date.now(),
                type: currentClass.pageType,
                gathered: false,
                audited: false,
                redirectUrl: '',
                internal: true
            }
        })

        return this.gatheredPages
    }

    async getRandomPagesUrl(url: string, numberOfPages = 1): Promise<string[]> {
        let pagesUrls: string[] = [];
        const page = await loadPage(url);


        const currentClass = this.constructor as typeof Gatherer

        const dataElements = currentClass.dataElements
        const menuDataElements = [...dataElements, 'custom-submenu']

        const host = new URL(url).hostname.replace("www.", "");

        for (const value of menuDataElements) {
            const dataElement = `[data-element="${value}"]`;
            const elementWithAtrr = await page.$(dataElement);

            let elementPagesUrls: any[] = [];

            if (!elementWithAtrr) continue;

            const elements = await elementWithAtrr.$$eval('li > a', (links: any[]) => {
                return links.map((link: any) => ({
                    href: link.href,
                    textContent: link.textContent
                }));
            });

            if (Object.keys(elements).length > 0) {

                for (const element of elements) {
                    let levelPageUrl = element.href

                    if (
                        levelPageUrl &&
                        levelPageUrl !== "#" &&
                        levelPageUrl !== ""
                    ) {

                        const isInternal = this.isInternalUrl(levelPageUrl)
                        if (
                            (isInternal) &&
                            !levelPageUrl.includes(url)
                        ) {
                            levelPageUrl = await this.buildUrl(url, levelPageUrl);
                        }

                        const pageHost = new URL(
                            levelPageUrl
                        ).hostname.replace("www.", "");

                        if (pageHost.includes(host)) {
                            elementPagesUrls.push(
                                levelPageUrl
                            );
                        }
                    }
                }
            }

            if (
                elementPagesUrls.length === 0 &&
                value !== 'custom-submenu'
            ) {
                throw new Error('value');
            }

            pagesUrls = [...pagesUrls, ...new Set(elementPagesUrls)]

        }
  
        //return this.getRandomNString(pagesUrls, numberOfPages);
        return pagesUrls
    };

    static async gotoRetry(page: Page, url: string, retryCount: number): Promise<any | null> {
        try {

            console.log(
                `${url} goto tentative:  ${retryCount} inizio`
            );

            let response = await page.goto(url, {
                waitUntil: ["load", "networkidle0"],
                timeout: 0,
            });

            try {
                await page.evaluate(async () => {
                    return window;
                });
            } catch (e) {

                console.log('context destroyed 1')
                try {
                    response = await page.goto(url, {
                        waitUntil: ["load", "networkidle0"],
                        timeout: 0,
                    });

                    await page.reload({
                        waitUntil: ["load", "networkidle0"],
                        timeout: 0,
                    });

                    await page.evaluate(async () => {
                        return window;
                    });
                } catch (e) {
                    console.log('context destroyed 2')
                    await page.goto(url, {
                        waitUntil: ["load", "networkidle0"],
                        timeout: 0,
                    });

                    response = await page.waitForNavigation({
                        waitUntil: ["load", "networkidle0"],
                        timeout: 0,
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

    async getHREFValuesDataAttribute(page: Page, elementDataAttribute: string, property: string = 'href'): Promise<any[]> {
        const urls = [];
        const element = await page.$(elementDataAttribute);

        if (element) {
            const href = await element.getProperty(property);
            if (href) {
                const hrefValue = await href.jsonValue();
                urls.push(hrefValue)
            } else {
                console.log('The element does not have an href attribute');
                throw new Error('The element does not have an href attribute')
            }
        } else {
            console.log('No element found with the data-element attribute' + elementDataAttribute);
            throw new Error('No element found with the data-element attribute' + elementDataAttribute)
        }

        return urls;
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

    isInternalUrl(url: string) {
        return (
            !url.includes("www") && !url.includes("http") && !url.includes("https")
        );
    };

    async buildUrl(url: string, path: string): Promise<string> {
        return new URL(path, url).href;
    };

    async getRandomNString(array: string[], numberOfElements: number) {
        if (array.length <= 0) {
            return [];
        }

        array = [...new Set(array)];

        if (numberOfElements > array.length || numberOfElements === -1) {
            return array;
        }

        array = array.sort(() => Math.random() - 0.5);
        array = array.slice(0, numberOfElements);

        return array;
    };

    async getPrimaryPageUrl(url: string, dataElement: string) {
        const $ = await loadPage(url);
        const pageElements = await this.getHREFValuesDataAttribute(
            $,
            `[data-element="${dataElement}"]`
        );

        if (pageElements.length <= 0) {
            return "";
        }

        let pageUrl = pageElements[0];
        if ((this.isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
            pageUrl = await this.buildUrl(url, pageUrl);
        }

        return pageUrl;
    };

    async getMultipleDataElementUrls(page: Page, dataElement: string) {
        const urls = [];
        const elements = await page.$$(`[data-element="${dataElement}"]`);

        if (elements && elements.length > 0) {
            for (let element of elements) {
                const href = await element.getProperty('href');
                if (href) {
                    const hrefValue = await href.jsonValue();
                    urls.push(hrefValue)
                } else {
                    console.log('The element does not have an href attribute');
                }
            }
        }
      
        return urls;
    }

    async getDataElementUrls(page: Page, dataElement: string) {
        const pageElements = await this.getHREFValuesDataAttribute(
            page,
            `[data-element="${dataElement}"]`
        );

        if (pageElements.length <= 0) {
            return [];
        }

        let pagesUrls = []
        for (let pageUrl of pageElements) {
            pagesUrls.push(await this.buildUrl(page.url(), pageUrl));
        }

        return pagesUrls;
    };

    async getButtonUrl(page: Page, dataElement: string) {
        const pageElements = await this.getButtonValuesDataAttribute(
            page,
            `[data-element="${dataElement}"]`,
        );

        if (pageElements.length <= 0) {
            return [];
        }

        let pagesUrls = []
        for (let pageUrl of pageElements) {
            pagesUrls.push(await this.buildUrl(page.url(), pageUrl));
        }

        return pagesUrls;
    };

    async getButtonValuesDataAttribute(page: Page, elementDataAttribute: string): Promise<any[]> {
        const urls = [];
        const elements: any = await page.$$(elementDataAttribute);

        if (!elements || elements.length === 0) {
            throw new Error(`Cannot find element with attribute ${elementDataAttribute}`)
        }

        let buttonUrls = []
        for (let element of elements) {

            let buttonOnclick = await element.evaluate((el: HTMLElement) => {
                const onclickAttribute = el.getAttribute('onclick');
                return onclickAttribute || '';
            });

            if (!buttonOnclick) {
                throw new Error(`Cannot access onclick property of button ${elementDataAttribute}`)
            }

            let buttonHref = buttonOnclick.substring(
                buttonOnclick.indexOf("'") + 1,
                buttonOnclick.lastIndexOf("'")
            );
            
            if (this.isInternalUrl(buttonHref)) {
                buttonHref = await this.buildUrl( page.url(),buttonHref)
            }

            buttonUrls.push(buttonHref)
        }

        return buttonUrls;
    };

    getPageType(){
        const currentClass = this.constructor as typeof Gatherer
        return currentClass.pageType;
    }
}

export { Gatherer };

