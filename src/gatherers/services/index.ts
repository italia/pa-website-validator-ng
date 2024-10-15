import { Gatherer } from "../Gatherer.js";
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData;
import { setTimeout } from "timers/promises";
import { Page } from "puppeteer";
import { getRandomNString } from "../../utils/utils.js";

class servicesGatherer extends Gatherer {
  static dataElement: string = "service-link";
  static pageType: string = "service";

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    website: "",
    page: Page,
  ): Promise<PageData[]> {
    let maxCountPages = 0;
    let clickButton = true;
    let foundElements: any = [];
    let pages: string[] = [];
    let click = false;

    while (clickButton) {
      try {
        clickButton = await page.evaluate(() => {
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

        await page.waitForNetworkIdle();

        foundElements = await page.$$(
          `[data-element="${servicesGatherer.dataElement}"]`,
        );

        const foundElementsHrefs: PageData[] | any = await Promise.all(
          foundElements.map(async (el: any) => {
            const href = await el.getProperty("href");
            const hrefValue = await href.jsonValue();
            return hrefValue;
          }),
        );

        pages = foundElementsHrefs;

        let currentCountPages = foundElementsHrefs.length;

        process.env["numberOfServicesFound"] = String(currentCountPages);

        if (!currentCountPages || currentCountPages === maxCountPages) {
          clickButton = false;
          continue;
        }

        maxCountPages = currentCountPages;
      } catch (e) {
        clickButton = false;
      }
    }

    if (!maxCountPages || (maxCountPages == 0 && click)) {
      throw new Error(
        `Cannot find elements with data-element "${servicesGatherer.dataElement}"`,
      );
    }

    pages = await getRandomNString(pages, numberOfPages);

    this.gatheredPages = pages.map((url: any) => {
      return {
        url: url,
        id: "service" + Date.now(),
        type: "service",
        gathered: false,
        audited: false,
        internal: true,
        redirectUrl: "",
      } as PageData;
    });

    return this.gatheredPages;
  }

  static getInstance(): Promise<servicesGatherer> {
    if (!servicesGatherer.instance) {
      servicesGatherer.instance = new servicesGatherer("", 3000);
    }
    return servicesGatherer.instance;
  }
}

export { servicesGatherer };
export default servicesGatherer.getInstance;
