import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { ElementHandle, Page } from "puppeteer";
import {
  buildUrl,
  getRandomNString,
  isInternalUrl,
} from "../../utils/utils.js";
import {DataElementError} from "../../utils/DataElementError.js";

class eventsGatherer extends Gatherer {
  static dataElements = ["event-link"];
  static dataElement: string = "event-link";
  static pageType: string = "event";

  async navigateAndFetchPages(
    url: string,
    numberOfPages: number,
    website: string,
    page: Page,
  ): Promise<PageData[]> {
    const currentClass = this.constructor as typeof Gatherer;

    let maxCountPages = 0;
    let clickButton = true;
    let pages: ElementHandle<Element>[] = [];
    let eventsPageUrls: string[] = [];

    while (clickButton) {
      try {
        clickButton = !!(await page.$('[data-element="load-other-cards"]'));

        if (!clickButton) {
          continue;
        }

        await page.click('[data-element="load-other-cards"]');

        console.log(`GATHERER events : load other events`);
        pages = await page.$$(`[data-element="${eventsGatherer.dataElement}"`);
        const currentCountPages = pages.length;

        if (!currentCountPages || currentCountPages === maxCountPages) {
          clickButton = false;
          continue;
        }

        maxCountPages = currentCountPages;
      } catch {
        clickButton = false;
      }
    }

    for (const page of pages) {
      let eventUrl = await page.evaluate((el) => el.getAttribute("href"));
      if (eventUrl && eventUrl !== "#" && eventUrl !== "") {
        if ((await isInternalUrl(eventUrl)) && !eventUrl.includes(url)) {
          eventUrl = await buildUrl(url, eventUrl);
        }
        eventsPageUrls.push(eventUrl);
      }
    }

    if (!maxCountPages || maxCountPages == 0) {
      throw new DataElementError(`Non è stato possibile trovare l'attributo [data-element="${eventsGatherer.dataElement}"]`);
    }

    eventsPageUrls = await getRandomNString(eventsPageUrls, numberOfPages);

    this.gatheredPages = eventsPageUrls.map((url: string) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited: false,
        internal: true,
        redirectUrl: "",
      };
    });

    return this.gatheredPages;
  }

  static getInstance(): eventsGatherer {
    if (!eventsGatherer.instance) {
      eventsGatherer.instance = new eventsGatherer("", 3000);
    }
    return eventsGatherer.instance;
  }
}

export { eventsGatherer };
export default eventsGatherer.getInstance;
