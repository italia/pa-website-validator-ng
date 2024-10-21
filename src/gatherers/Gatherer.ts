import { ElementHandle, JSHandle, Page } from "puppeteer";
import { PageData } from "../types/crawler-types.js";
import { getRandomNString, loadPage } from "../utils/utils.js";
import { DataElementError } from "../utils/DataElementError.js";

abstract class Gatherer {
  id: string;
  timeout: number;
  gatheredPages: PageData[];
  protected static instance: Gatherer;
  static pageType: string;
  static dataElements: string[];

  private requestTimeout = parseInt(process.env["requestTimeout"] ?? "60000");

  protected constructor(id: string, timeout = this.requestTimeout) {
    this.id = id;
    this.timeout = timeout;
    this.gatheredPages = [];
  }

  async createGatherer(
    id: string,
    gathererPageType: string[],
    auditsIds: string[],
  ) {
    return this.constructor(id, gathererPageType, auditsIds);
  }

  async navigateAndFetchPages(
    url: string,
    numberOfPages?: number,
    website?: string,
    page?: Page | null,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0 || !page) {
      return this.gatheredPages;
    }

    const randomPagesUrl = await this.getRandomPagesUrl(
      url,
      numberOfPages ?? -1,
    );

    const currentClass = this.constructor as typeof Gatherer;
    this.gatheredPages = randomPagesUrl.map((url) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited: false,
        redirectUrl: "",
        internal: true,
      };
    });

    return this.gatheredPages;
  }

  async getRandomPagesUrl(
    url: string,
    numberOfPages: number,
  ): Promise<string[]> {
    let pagesUrls: string[] = [];
    const page = await loadPage(url);

    const currentClass = this.constructor as typeof Gatherer;

    const dataElements = currentClass.dataElements;
    const menuDataElements = [...dataElements, "custom-submenu"];

    const host = new URL(url).hostname.replace("www.", "");

    for (const value of menuDataElements) {
      const dataElement = `[data-element="${value}"]`;
      const elementWithAtrr = await page.$(dataElement);

      const elementPagesUrls: string[] = [];

      if (!elementWithAtrr) continue;

      const elements = await elementWithAtrr.$$eval("li > a", (links) => {
        return links.map((link) => ({
          href: link.href,
          textContent: link.textContent,
        }));
      });

      if (Object.keys(elements).length > 0) {
        for (const element of elements) {
          let levelPageUrl = element.href;

          if (levelPageUrl && levelPageUrl !== "#" && levelPageUrl !== "") {
            const isInternal = this.isInternalUrl(levelPageUrl);
            if (isInternal && !levelPageUrl.includes(url)) {
              levelPageUrl = await this.buildUrl(url, levelPageUrl);
            }

            const pageHost = new URL(levelPageUrl).hostname.replace("www.", "");

            if (pageHost.includes(host)) {
              elementPagesUrls.push(levelPageUrl);
            }
          }
        }
      }

      if (elementPagesUrls.length === 0 && value !== "custom-submenu") {
        throw new Error("value");
      }

      pagesUrls = [...pagesUrls, ...new Set(elementPagesUrls)];
    }

    pagesUrls = await getRandomNString(pagesUrls, numberOfPages);

    return pagesUrls;
  }

  static async gotoRetry(
    page: Page,
    url: string,
    retryCount: number,
  ): Promise<unknown | null> {
    try {
      let response = await page.goto(url, {
        waitUntil: ["load", "networkidle0"],
        timeout: 0,
      });

      try {
        await page.evaluate(async () => {
          return window;
        });
      } catch {
        console.log("context destroyed 1");
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
        } catch {
          console.log("context destroyed 2");
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
      console.log("");
      if (retryCount <= 0) {
        throw error;
      }
      console.log(`${url} goto tentative:  ${retryCount}`);
      return await this.gotoRetry(page, url, retryCount - 1);
    }
  }

  async getHREFValuesDataAttribute(
    page: Page,
    elementDataAttribute: string,
    property: string = "href",
  ): Promise<string[]> {
    const urls: string[] = [];
    const element = await page.$(elementDataAttribute);

    if (element) {
      const href = await element.getProperty(property);
      if (href) {
        const hrefValue = await href.jsonValue();
        urls.push(String(hrefValue));
      } else {
        console.log("The element does not have an href attribute");
        throw new Error("The element does not have an href attribute");
      }
    } else {
      console.log(
        "No element found with the data-element attribute" +
          elementDataAttribute,
      );
      throw new DataElementError(
        `Non è stato possibile trovare l'attributo ${elementDataAttribute}`,
      );
    }

    return urls;
  }

  async getChildrenFromJSHandle(jsHandle: JSHandle) {
    const children = await jsHandle.getProperties();
    const childElements = [];

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
  }

  async buildUrl(url: string, path: string): Promise<string> {
    return new URL(path, url).href;
  }

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
  }

  async getPrimaryPageUrl(url: string, dataElement: string) {
    const $ = await loadPage(url);
    const pageElements = await this.getHREFValuesDataAttribute(
      $,
      `[data-element="${dataElement}"]`,
    );

    if (pageElements.length <= 0) {
      return "";
    }

    let pageUrl = pageElements[0];
    if (this.isInternalUrl(pageUrl) && !pageUrl.includes(url)) {
      pageUrl = await this.buildUrl(url, pageUrl);
    }

    return pageUrl;
  }

  async getMultipleDataElementUrls(page: Page, dataElement: string) {
    const urls = [];
    const elements = await page.$$(`[data-element="${dataElement}"]`);

    if (elements && elements.length > 0) {
      for (const element of elements) {
        const href = await element.getProperty("href");
        if (href) {
          const hrefValue = await href.jsonValue();
          urls.push(hrefValue);
        } else {
          console.log("The element does not have an href attribute");
        }
      }
    }

    return urls;
  }

  async getDataElementUrls(page: Page, dataElement: string) {
    const pageElements = await this.getHREFValuesDataAttribute(
      page,
      `[data-element="${dataElement}"]`,
    );

    if (pageElements.length <= 0) {
      return [];
    }

    const pagesUrls = [];
    for (const pageUrl of pageElements) {
      pagesUrls.push(await this.buildUrl(page.url(), pageUrl));
    }

    return pagesUrls;
  }

  async getButtonUrl(page: Page, dataElement: string) {
    const pageElements = await this.getButtonValuesDataAttribute(
      page,
      `[data-element="${dataElement}"]`,
    );

    if (pageElements.length <= 0) {
      return [];
    }

    const pagesUrls = [];
    for (const pageUrl of pageElements) {
      pagesUrls.push(await this.buildUrl(page.url(), pageUrl));
    }

    return pagesUrls;
  }

  async getButtonValuesDataAttribute(
    page: Page,
    elementDataAttribute: string,
  ): Promise<string[]> {
    const url = page.url();
    const elements: ElementHandle<Element>[] =
      await page.$$(elementDataAttribute);

    if (!elements || elements.length === 0) {
      throw new DataElementError(
        `Non è stato possibile trovare l'attributo [data-element="${elementDataAttribute}"]`,
      );
    }

    const buttonUrls = [];
    for (const element of elements) {
      const buttonOnclick = await element.evaluate((el) => {
        const onclickAttribute = el.getAttribute("onclick");
        return onclickAttribute || "";
      });

      const buttonHrefAttr = await element.evaluate((el) => {
        const hrefAttribute = el.getAttribute("href");
        return hrefAttribute || "";
      });
      let finalUrl = "";

      if (buttonOnclick && buttonOnclick.includes("location.href")) {
        finalUrl = buttonOnclick.substring(
          buttonOnclick.indexOf("'") + 1,
          buttonOnclick.lastIndexOf("'"),
        );

        if (!finalUrl.includes(url)) {
          finalUrl = await this.buildUrl(url, finalUrl);
        }
      } else if (buttonHrefAttr) {
        finalUrl = buttonHrefAttr;
        if (!finalUrl.includes(url)) {
          finalUrl = await this.buildUrl(url, finalUrl);
        }
      }

      if (!buttonOnclick && !buttonHrefAttr) {
        throw new Error(
          `Cannot access on properties href/onclick of button ${elementDataAttribute}`,
        );
      }

      buttonUrls.push(finalUrl);
    }

    return buttonUrls;
  }

  getPageType() {
    const currentClass = this.constructor as typeof Gatherer;
    return currentClass.pageType;
  }
}

export { Gatherer };
