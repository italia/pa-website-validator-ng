"use strict";
import {
  OrderResult as OrderType,
  VocabularyResult,
} from "../types/crawler-types.js";
import { setTimeout } from "timers/promises";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import {
  Browser,
  Cookie as CookieProtocol,
  Dialog,
  EvaluateFunc,
  HTTPRequest,
  HTTPResponse,
  Page,
} from "puppeteer";
import axios from "axios";
import { LRUCache } from "lru-cache";
import { MenuItem } from "../types/menuItem.js";
import { errorHandling } from "../config/commonAuditsParts.js";
import { initializePuppeteer, userAgent } from "../PuppeteerInstance.js";

const cache = new LRUCache<string, CheerioAPI>({ max: 50 });
const redirectUrlCache = new LRUCache<string, string>({ max: 50 });
const requestTimeout = parseInt(process.env["requestTimeout"] ?? "300000");

const loadPageData = async (
  url: string,
  wait: boolean = false,
): Promise<CheerioAPI> => {
  const data_from_cache = cache.get(url);
  if (data_from_cache !== undefined) {
    return data_from_cache;
  }
  let data = "";

  const browser = await initializePuppeteer();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent);

  page.on("dialog", async (dialog: Dialog) => {
    console.log(
      `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Navigation to ${url} interrupted by dialog with message : "${dialog.message()}"`,
    );
    await dialog.dismiss();
    console.log(
      `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Dismissed dialog`,
    );
  });

  await page.setRequestInterception(true);
  page.on("request", (request: HTTPRequest) => {
    if (
      ["image", "imageset", "media"].indexOf(request.resourceType()) !== -1 ||
      new URL(request.url()).pathname.endsWith(".pdf") ||
      request.url().includes("https://ingestion.webanalytics.italia.it")
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });

  await gotoRetry(page, url, errorHandling.gotoRetryTentative);

  const redirectedUrl = await safePageEvaluate(page, async () => {
    return window.location.href;
  });

  if (redirectUrlCache.get(url) === undefined) {
    redirectUrlCache.set(url, redirectedUrl);
  }

  if (wait) {
    await Promise.race([
      setTimeout(20000),
      page.waitForNetworkIdle({
        idleTime: 2000,
      }),
    ]);
  }

  data = await safePageContent(page);

  await page.goto("about:blank");
  await page.close();

  const c = cheerio.load(data);
  cache.set(url, c);
  cache.set(redirectedUrl, c);
  return c;
};

const loadPage = async (
  url: string,
  retryCount = errorHandling.loadPageDataRetryTentative,
): Promise<Page> => {
  try {
    const browser = await initializePuppeteer();
    const page = await newPageRetry(browser);

    await page.setUserAgent(userAgent);
    page.on("dialog", async (dialog: Dialog) => {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Navigation to ${url} interrupted by dialog with message : "${dialog.message()}"`,
      );
      await dialog.dismiss();
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Dismissed dialog`,
      );
    });

    await page.setRequestInterception(true);
    await page.on("request", (request: HTTPRequest) => {
      if (
        ["image", "imageset", "media"].indexOf(request.resourceType()) !== -1 ||
        new URL(request.url()).pathname.endsWith(".pdf") ||
        request.url().includes("https://ingestion.webanalytics.italia.it") ||
        request.url().includes("https://www.gstatic.com/recaptcha") ||
        request.url().includes("https://www.google.com/recaptcha")
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await gotoRetry(page, url, 3);

    await Promise.race([
      setTimeout(20000),
      page.waitForNetworkIdle({
        idleTime: 2000,
      }),
    ]);

    return page;
  } catch (ex) {
    console.error(`ERROR LOADPAGE FUNCTION ${url}: ${ex}`);
    if (ex instanceof Error) {
      if (
        errorHandling.loadPageDataRetryErrorMessages.filter((searchString) =>
          ex.message.includes(searchString),
        ).length > 0 &&
        retryCount > 0
      ) {
        console.log(
          `${url} loadPageData retry tentative: ${errorHandling.gotoRetryTentative - retryCount}`,
        );
        return await loadPage(url, retryCount - 1);
      }
      throw new Error(ex.message);
    } else {
      throw new Error(String(ex));
    }
  }
};

const gotoRetry = async (
  page: Page,
  url: string,
  retryCount: number,
): Promise<HTTPResponse | null> => {
  try {
    let response = await page.goto(url, {
      waitUntil: ["load", "networkidle0"],
      timeout: requestTimeout,
    });

    try {
      await page.evaluate(async () => {
        return window;
      });
    } catch {
      try {
        response = await page.goto(url, {
          waitUntil: ["load", "networkidle0"],
          timeout: requestTimeout,
        });

        await page.reload({
          waitUntil: ["load", "networkidle0"],
          timeout: requestTimeout,
        });

        await page.evaluate(async () => {
          return window;
        });
      } catch {
        await page.goto(url, {
          waitUntil: ["load", "networkidle0"],
          timeout: requestTimeout,
        });

        response = await page.waitForNavigation({
          waitUntil: ["load", "networkidle0"],
          timeout: requestTimeout,
        });
      }
    }

    return response;
  } catch (error) {
    if (retryCount <= 0) {
      throw error;
    }

    console.log(
      `${url} goto tentative: ${errorHandling.gotoRetryTentative - retryCount}`,
    );
    return await gotoRetry(page, url, retryCount - 1);
  }
};

const safePageEvaluate = async <T>(
  page: Page,
  fn: () => T,
  retryCount = errorHandling.gotoRetryTentative,
): Promise<T> => {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return (await page.evaluate(fn)) as T;
    } catch (err) {
      const msg = (err as Error).message || "";
      const isContextDestroyed = msg.includes(
        "Execution context was destroyed",
      );

      if (isContextDestroyed) {
        console.warn(
          `Contesto distrutto (tentativo ${attempt + 1}/${retryCount}). Eseguo gotoRetry.`,
        );
        await gotoRetry(page, page.url(), retryCount);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Impossibile eseguire page.evaluate dopo vari retry");
};

const safePageEvaluateWithArgs = async <T, Params extends unknown[]>(
  page: Page,
  fn: EvaluateFunc<Params>,
  args: Params,
  retryCount = errorHandling.gotoRetryTentative,
): Promise<T> => {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return (await page.evaluate(fn, ...args)) as T;
    } catch (err) {
      const msg = (err as Error).message || "";
      const isContextDestroyed = msg.includes(
        "Execution context was destroyed",
      );

      if (isContextDestroyed) {
        console.warn(
          `Contesto distrutto (tentativo ${attempt + 1}/${retryCount}). Eseguo gotoRetry.`,
        );
        await gotoRetry(page, page.url(), retryCount);
        continue;
      }

      throw err;
    }
  }

  throw new Error(
    "Impossibile eseguire page.evaluate with args dopo vari retry",
  );
};

const safePageContent = async (
  page: Page,
  retryCount = errorHandling.gotoRetryTentative,
): Promise<string> => {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await page.content();
    } catch (err) {
      const msg = (err as Error).message || "";
      const isContextDestroyed = msg.includes(
        "Execution context was destroyed",
      );

      if (isContextDestroyed) {
        console.warn(
          `Contesto distrutto (tentativo ${attempt + 1}/${retryCount}). Eseguo gotoRetry.`,
        );
        await gotoRetry(page, page.url(), retryCount);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Impossibile eseguire page.content dopo vari retry");
};

const newPageRetry = async (
  browser: Browser,
  retryCount: number = errorHandling.gotoRetryTentative,
): Promise<Page> => {
  try {
    return await browser.newPage();
  } catch (error) {
    if (retryCount <= 0) {
      throw error;
    }

    console.log(
      `new page tentative: ${errorHandling.gotoRetryTentative - retryCount}`,
    );
    await setTimeout(1000);
    return await newPageRetry(browser, retryCount - 1);
  }
};

const safeCookies = async (
  page: Page,
  retryCount = errorHandling.gotoRetryTentative,
): Promise<CookieProtocol[]> => {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await page.cookies();
    } catch (err) {
      const msg = (err as Error).message || "";
      const isContextDestroyed = msg.includes(
        "Execution context was destroyed",
      );

      if (isContextDestroyed) {
        console.warn(
          `Contesto distrutto (tentativo ${attempt + 1}/${retryCount}). Eseguo gotoRetry.`,
        );
        await gotoRetry(page, page.url(), retryCount);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Impossibile eseguire page.cookies dopo vari retry");
};

const getPageElementDataAttribute = async (
  $: CheerioAPI,
  elementDataAttribute: string,
  tag = "",
): Promise<string[]> => {
  const returnValues: string[] = [];

  let elements = $(elementDataAttribute);

  if (tag !== "") {
    if (Object.keys(elements).length === 0) {
      return returnValues;
    }

    elements = $(elements).find(tag);
  }

  if (Object.keys(elements).length === 0) {
    return returnValues;
  }

  for (const element of elements) {
    const stringElement = $(element).text().trim() ?? null;
    if (stringElement) {
      returnValues.push(stringElement);
    }
  }

  return [...new Set(returnValues)];
};

const getElementHrefValuesDataAttribute = async (
  $: CheerioAPI,
  elementDataAttribute: string,
  tag = "",
): Promise<Array<{ label: string; url: string }> | []> => {
  const elements = $(elementDataAttribute);

  if (Object.keys(elements).length === 0) {
    return [];
  }

  const innerElements = $(elements).find(tag);

  if (Object.keys(innerElements).length === 0) {
    return [];
  }

  const urls = [];
  for (const innerElement of innerElements) {
    const label = $(innerElement).text().trim() ?? "";
    const url = $(innerElement).attr()?.href;
    if (url && url !== "#" && url !== "") {
      urls.push({
        label: label,
        url: url,
      });
    }
  }

  return urls;
};

const getHREFValuesDataAttribute = async (
  $: CheerioAPI,
  elementDataAttribute: string,
): Promise<string[]> => {
  const serviceUrls = [];

  const elements = $(elementDataAttribute);
  for (const element of elements) {
    const elementObj = $(element).attr();
    if (
      elementObj &&
      "href" in elementObj &&
      elementObj.href !== "#" &&
      elementObj.href !== ""
    ) {
      serviceUrls.push(elementObj.href);
    }
  }

  if (serviceUrls.length <= 0) {
    return [];
  }

  return serviceUrls;
};

const buildUrl = async (url: string, path: string): Promise<string> => {
  return new URL(path, url).href;
};

const isInternalUrl = async (url: string) => {
  return (
    !url.includes("www") && !url.includes("http") && !url.includes("https")
  );
};

const toMenuItem = (str: string): MenuItem => ({
  name: str,
  regExp: new RegExp(`^${str}$`),
});

const arraysAreEqual = (arr1: MenuItem[], arr2: string[]) => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (!arr1[i].regExp.test(arr2[i])) {
      return false;
    }
  }
  return true;
};

const checkOrder = (mandatoryElements: MenuItem[], foundElements: string[]) => {
  const singleMove: string[] = [];
  if (arraysAreEqual(mandatoryElements, foundElements)) {
    return {
      inOrder: true,
      singleMove,
    };
  }

  for (const value of mandatoryElements.values()) {
    const tmpMandatoryElements = mandatoryElements.filter(
      (item) => item !== value,
    );

    const tmpFoundElements = foundElements.filter(
      (item) => !value.regExp.test(item),
    );

    if (arraysAreEqual(tmpMandatoryElements, tmpFoundElements)) {
      const valueFound = foundElements.filter((item) =>
        value.regExp.test(item),
      )[0];
      singleMove.push(valueFound);
    }
  }

  return {
    inOrder: false,
    singleMove,
  };
};

const checkOrderLoose = (
  mandatoryElements: MenuItem[],
  foundElements: string[],
): OrderType => {
  const newMandatoryElements = mandatoryElements.filter((e) =>
    foundElements.some((f) => e.regExp.test(f)),
  );
  const newFoundElements = foundElements.filter((e) =>
    newMandatoryElements.some((f) => f.regExp.test(e)),
  );

  return checkOrder(newMandatoryElements, newFoundElements);
};

const missingMenuItems = (
  menuElements: string[],
  mandatoryElements: MenuItem[],
): string[] =>
  mandatoryElements
    .filter((e) => menuElements.every((f) => !e.regExp.test(f)))
    .map((e) => e.name);

const urlExists = async (
  url: string,
  href: string,
  checkHttps = false,
  ignoreErrorCodes: number[] = [],
): Promise<{
  result: boolean;
  exception?: boolean;
  reason: string;
  inspectedUrl: string;
}> => {
  let inspectUrl = href;
  if ((await isInternalUrl(href)) && !href.includes(url)) {
    inspectUrl = await buildUrl(url, href);
  }

  try {
    if (checkHttps) {
      if (!inspectUrl.includes("https")) {
        return {
          result: false,
          reason: " Protocollo HTTPS mancante nell'URL.",
          inspectedUrl: inspectUrl,
        };
      }
    }

    let statusCode = undefined;
    try {
      const response = await axios.get(inspectUrl, {
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
      statusCode = response.status;
    } catch (e: any) {
      if (
        e.response &&
        e.response.status &&
        ignoreErrorCodes.includes(e.response.status)
      ) {
        statusCode = e.response.status;
        console.log(
          `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ignored status code ${statusCode} on url ${url}`,
        );
      } else {
        return {
          result: false,
          exception: true,
          reason: " Hostname non valido.",
          inspectedUrl: inspectUrl,
        };
      }
    }

    if (
      statusCode === undefined ||
      statusCode < 200 ||
      (statusCode >= 400 && !ignoreErrorCodes.includes(statusCode))
    ) {
      return {
        result: false,
        reason: " Pagina non trovata.",
        inspectedUrl: inspectUrl,
      };
    }

    return {
      result: true,
      reason: "",
      inspectedUrl: inspectUrl,
    };
  } catch {
    return {
      result: false,
      reason: "",
      inspectedUrl: inspectUrl,
    };
  }
};
const areAllElementsInVocabulary = async (
  pageArguments: string[],
  vocabularyElements: string[],
): Promise<VocabularyResult> => {
  let result = true;

  if (pageArguments.length <= 0) {
    result = false;
  }

  const lowerCasedVocabulary = vocabularyElements.map((vocabularyElements) =>
    vocabularyElements.toLowerCase(),
  );

  const elementNotIncluded = [];
  const elementIncluded = [];
  for (const pageArgument of pageArguments) {
    if (lowerCasedVocabulary.indexOf(pageArgument.toLowerCase()) === -1) {
      result = false;
      elementNotIncluded.push(pageArgument.toLowerCase());
    } else {
      elementIncluded.push(pageArgument.toLowerCase());
    }
  }

  return {
    allArgumentsInVocabulary: result,
    elementNotIncluded: elementNotIncluded,
    elementIncluded: elementIncluded,
  };
};

const getRandomNString = async (array: string[], numberOfElements: number) => {
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

const checkBreadcrumb = (array: string[]) => {
  if (array.length === 0) return false;

  const indexService = array.indexOf("servizi");

  if (indexService < 0 || indexService + 1 >= array.length) return false;

  return array[indexService + 1].length >= 3;
};

const cmsThemeRx =
  /\/\*!\s*Theme Name:.*\s+Author:.*\s+Description:\s+Design (Comuni|Scuole) Italia .*(?<name>WordPress|Drupal).*\s+Version:\s+(?<version>.*)\s+License:.*\s+Text Domain: design_(comuni|scuole)_italia\s*\*\//;

const getAllPageHTML = async (url: string): Promise<string> => {
  const $: CheerioAPI = await loadPageData(url);

  return $("html").text() ?? "";
};

const getRedirectedUrl = async (url: string): Promise<string> => {
  const url_from_cache = redirectUrlCache.get(url);
  if (url_from_cache !== undefined) {
    return url_from_cache;
  }

  let redirectedUrl = "";

  try {
    const browser = await initializePuppeteer();
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);

    page.on("dialog", async (dialog: Dialog) => {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Navigation to ${url} interrupted by dialog with message : "${dialog.message()}"`,
      );
      await dialog.dismiss();
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Dismissed dialog`,
      );
    });

    await page.setRequestInterception(true);
    page.on("request", (request: HTTPRequest) => {
      if (
        ["image", "imageset", "media"].indexOf(request.resourceType()) !== -1 ||
        new URL(request.url()).pathname.endsWith(".pdf")
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await gotoRetry(page, url, errorHandling.gotoRetryTentative);

    redirectedUrl = await safePageEvaluate(page, async () => {
      return window.location.href;
    });

    redirectUrlCache.set(url, redirectedUrl);

    const data = await page.content();
    const c = cheerio.load(data);
    if (cache.get(url) === undefined) {
      cache.set(url, c);
    }

    if (cache.get(redirectedUrl) === undefined) {
      cache.set(redirectedUrl, c);
    }

    await page.goto("about:blank");
    await page.close();
  } catch (ex) {
    console.error(`ERROR ${url}: ${ex}`);
    throw new Error(
      `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`,
    );
  }

  return redirectedUrl;
};

const redirectUrlIsInternal = async (page: Page) => {
  if (!process.env["website"]) {
    return true;
  }

  const host = new URL(process.env["website"] ?? "").hostname.replace(
    "www.",
    "",
  );

  const redirectedUrl = await safePageEvaluate(page, async () => {
    return window.location.href;
  });

  const redirectedHost = new URL(redirectedUrl).hostname.replace("www.", "");
  return redirectedHost.includes(host);
};

const scrollToBottom = async (page: Page) => {
  await safePageEvaluate(page, async () => {
    await new Promise((resolve) => {
      const distance = 100;
      const delay = 50;
      let totalHeight = 0;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve("");
        }
      }, delay);
    });
  });
};

export {
  toMenuItem,
  checkOrder,
  checkOrderLoose,
  missingMenuItems,
  loadPageData,
  loadPage,
  gotoRetry,
  safePageEvaluate,
  safePageEvaluateWithArgs,
  safePageContent,
  safeCookies,
  getRandomNString,
  getPageElementDataAttribute,
  getHREFValuesDataAttribute,
  getElementHrefValuesDataAttribute,
  isInternalUrl,
  buildUrl,
  urlExists,
  areAllElementsInVocabulary,
  checkBreadcrumb,
  cmsThemeRx,
  getAllPageHTML,
  requestTimeout,
  getRedirectedUrl,
  redirectUrlIsInternal,
  scrollToBottom,
};
