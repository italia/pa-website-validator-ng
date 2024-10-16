import { Gatherer } from "../Gatherer.js";
import {PageData} from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import {
  buildUrl,
  getRandomNString,
  isInternalUrl,
} from "../../utils/utils.js";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";

class eventsGatherer extends Gatherer {
  static dataElements = ["event-link"];
  static dataElement: string = "event-link";
  static pageType: string = "event";

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    website = "",
    page: Page,
  ): Promise<PageData[]> {
    const currentClass = this.constructor as typeof Gatherer;

    let maxCountPages = 0;
    let clickButton: any = true;
    let pages: any[] = [];
    let eventsPageUrls: string[] = [];

    while (clickButton) {
      try {
        clickButton = await page.$('[data-element="load-other-cards"]');
        console.log("BUTTON FOUND", clickButton);
        if (!clickButton) {
          continue;
        }

        await page.click('[data-element="load-other-cards"]');

        console.log(`GATHERER events : load other events`);
        pages = await page.$$(`[data-element="${eventsGatherer.dataElement}"`);
        const currentCountPages = pages.length;

        console.log(currentCountPages);
        if (!currentCountPages || currentCountPages === maxCountPages) {
          clickButton = false;
          continue;
        }

        maxCountPages = currentCountPages;
      } catch (e) {
        console.log("CATCH???");
        clickButton = false;
      }
    }

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    for (const page of pages) {
      let eventUrl = $(page).attr()?.href;
      if (eventUrl && eventUrl !== "#" && eventUrl !== "") {
        if ((await isInternalUrl(eventUrl)) && !eventUrl.includes(url)) {
          eventUrl = await buildUrl(url, eventUrl);
        }
        eventsPageUrls.push(eventUrl);
      }
    }

    if (!maxCountPages || maxCountPages == 0) {
      throw new Error(
        `Cannot find elements with data-element "${eventsGatherer.dataElement}"`,
      );
    }

    eventsPageUrls = await getRandomNString(eventsPageUrls, numberOfPages);

    this.gatheredPages = eventsPageUrls.map((url: any) => {
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

  static getInstance(): Promise<eventsGatherer> {
    if (!eventsGatherer.instance) {
      eventsGatherer.instance = new eventsGatherer("", 3000);
    }
    return eventsGatherer.instance;
  }
}

export { eventsGatherer };
export default eventsGatherer.getInstance;
