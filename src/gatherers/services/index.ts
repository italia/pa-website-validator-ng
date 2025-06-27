import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { setTimeout } from "timers/promises";
import { Page } from "puppeteer";
import {
  getRandomNString,
  loadPage,
  safePageEvaluate,
} from "../../utils/utils.js";
import { DataElementError } from "../../utils/DataElementError.js";

class servicesGatherer extends Gatherer {
  static dataElement: string = "service-link";
  static pageType: string = "service";
  static pageTitle: string = "Servizio";

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    page: Page,
  ): Promise<PageData[]> {
    let maxCountPages = 0;
    let clickButton = true;
    let foundElements = [];
    let pages: string[] = [];
    let click = false;
    const secondPageLevel: string = "pager-link";

    while (clickButton) {
      clickButton = await safePageEvaluate(page, () => {
        const button = document.querySelector(
          '[data-element="load-other-cards"]',
        ) as HTMLElement;
        if (!button) {
          return true;
        }
        click = true;
        button.click();
        return true;
      });

      if (!clickButton) {
        continue;
      }

      await Promise.race([
        setTimeout(10000),
        page.waitForNetworkIdle({
          idleTime: 2000,
        }),
      ]);

      foundElements = await page.$$(
        `[data-element="${servicesGatherer.dataElement}"]`,
      );

      const foundElementsHrefs: string[] = await Promise.all(
        foundElements.map(async (el) => {
          const href = await el.getProperty("href");
          const jsonValue = await href.jsonValue();
          const hrefValue: string = String(jsonValue);
          return hrefValue;
        }),
      );

      pages = foundElementsHrefs;

      const currentCountPages = foundElementsHrefs.length;

      process.env["numberOfServicesFound"] = String(currentCountPages);

      if (!currentCountPages || currentCountPages === maxCountPages) {
        clickButton = false;
        continue;
      }

      maxCountPages = currentCountPages;
    }

    const foundSecondLevel = await page.$$(
      `[data-element="${secondPageLevel}"]`,
    );

    const foundElementSecondHref: string[] = await Promise.all(
      foundSecondLevel.map(async (el) => {
        const href = await el.getProperty("href");
        const jsonValue = await href.jsonValue();
        const hrefValue: string = String(jsonValue);
        return hrefValue;
      }),
    );

    if (foundElementSecondHref.length && foundElementSecondHref[0] != "") {
      const secondPage: Page | null = await loadPage(foundElementSecondHref[0]);

      if (secondPage) {
        const foundElementsSecondLevel = await secondPage.$$(
          `[data-element="${servicesGatherer.dataElement}"]`,
        );

        const foundElementSecondLevelHref: string[] = await Promise.all(
          foundElementsSecondLevel.map(async (el) => {
            const href = await el.getProperty("href");
            const jsonValue = await href.jsonValue();
            const hrefValue: string = String(jsonValue);
            return hrefValue;
          }),
        );

        pages = foundElementSecondLevelHref;
        maxCountPages = pages.length;

        process.env["numberOfServicesFound"] = String(maxCountPages);

        await secondPage.close();
      }
    }

    if (pages.includes("undefined")) {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} GATHERING \x1b[32m ${this.getPageType()}\x1b[0m  on ${url} - INFO : found empty href for data-element "service-link"`,
      );
    }
    pages = pages.filter((href) => href !== "undefined");
    maxCountPages = pages.length;
    process.env["numberOfServicesFound"] = String(maxCountPages);

    if (!maxCountPages || (maxCountPages == 0 && click)) {
      throw new DataElementError(
        `Non è stato possibile trovare l'attributo [data-element="${servicesGatherer.dataElement}"]`,
      );
    }

    pages = await getRandomNString(pages, numberOfPages);

    this.gatheredPages = pages.map((url: string) => {
      return {
        url: url,
        id: "service" + Date.now(),
        type: "service",
        gathered: false,
        audited: false,
      } as PageData;
    });

    return this.gatheredPages;
  }

  static getInstance(): servicesGatherer {
    if (!servicesGatherer.instance) {
      servicesGatherer.instance = new servicesGatherer("");
    }
    return servicesGatherer.instance;
  }
}

export { servicesGatherer };
export default servicesGatherer.getInstance;
