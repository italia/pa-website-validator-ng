import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {Page} from "puppeteer";


class eventsGatherer extends Gatherer {

  static dataElements = ["event-link"]
  static dataElement: string = 'event-link'
  static pageType: string = 'event'

  async navigateAndFetchPages(url: string, numberOfPages = 5, website = '', page: Page): Promise<PageData[]> {

    let maxCountPages = 0;
    let clickButton : any = true;
    while (clickButton) {
      try {
        clickButton = await page.$('[data-element="load-other-cards"]') 
        console.log('BUTTON FOUND', clickButton)
        if (!clickButton) {
          continue;
        }

        await page.click('[data-element="load-other-cards"]');
 
        console.log(`GATHERER events : load other events`)
        const currentCountPages = ((await page.$$(`[data-element="${eventsGatherer.dataElement}"`)).length);

        console.log(currentCountPages)
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

    if (!maxCountPages || maxCountPages == 0) {
      await page.close()
      throw new Error(`Cannot find elements with data-element "${eventsGatherer.dataElement}"`)
    }

    await page.close()
    return this.gatheredPages ?? []
  }

  static getInstance(): Promise<eventsGatherer> {
    if (!eventsGatherer.instance) {
      eventsGatherer.instance = new eventsGatherer('', 3000);
    }
    return eventsGatherer.instance;
  }

}

export { eventsGatherer };
export default eventsGatherer.getInstance;
