import { Gatherer } from "../Gatherer.js";
import {PageData} from "../../types/crawler-types.js";
import { setTimeout } from "timers/promises";
import { Page } from "puppeteer";
import {getRandomNString, loadPage} from "../../utils/utils.js";

class servicesGatherer extends Gatherer {
  static dataElement: string = "service-link";
  static pageType: string = "service";
  secondPageLevel: string = "pager-link";

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    website: "",
    page: Page,
  ): Promise<PageData[]> {
    let maxCountPages = 0;
    let clickButton = true;
    let foundElements = [];
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

        const foundElementsHrefs : string[] = await Promise.all(
          foundElements.map(async (el) => {
            const href = await el.getProperty("href");
            const jsonValue = await href.jsonValue();
            const hrefValue : string = String(jsonValue);
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
      } catch {
        clickButton = false;
      }
    }


    const foundSecondLevel = await page.$$(
        `[data-element="${this.secondPageLevel}"]`,
    );

    const foundElementSecondHref: PageData[] | any = await Promise.all(
        foundSecondLevel.map(async (el: any) => {
          const href = await el.getProperty("href");
          const hrefValue = await href.jsonValue();
          return hrefValue;
        }),
    );

    if(foundElementSecondHref.length){
      const secondPage : Page | null = await loadPage(foundElementSecondHref[0]);

      if(secondPage){
        const foundElementsSecondLevel = await secondPage.$$(
            `[data-element="${servicesGatherer.dataElement}"]`,
        );

        const foundElementSecondLevelHref: PageData[] | any = await Promise.all(
            foundElementsSecondLevel.map(async (el: any) => {
              const href = await el.getProperty("href");
              const hrefValue = await href.jsonValue();
              return hrefValue;
            }),
        );

        pages = foundElementSecondLevelHref;
        const currentCountPages = foundElementSecondLevelHref.length;
        maxCountPages = currentCountPages;

        process.env["numberOfServicesFound"] = String(currentCountPages);

        await secondPage.close();
      }
    }


    if (!maxCountPages || (maxCountPages == 0 && click)) {
      throw new Error(
        `Cannot find elements with data-element "${servicesGatherer.dataElement}"`,
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
