import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import puppeteer, { HTTPResponse, JSHandle, Page } from "puppeteer";
import requestPages = crawlerTypes.requestPages;
import pageLink = crawlerTypes.pageLink;
import {
  customPrimaryMenuItemsDataElement,
  menuItems,
  primaryMenuDataElement,
  primaryMenuItems,
} from "../../storage/school/menuItems.js";
interface PageData {
  id: string;
  url: string;
}

export class firstLevelPagesGatherer extends Gatherer {

  async navigateAndFetchPages(url: string, pagesToBeAnalyzed: any[], id: string): Promise<PageData[]> {
    const randomPagesUrl = await this.getRandomFirstLevelPagesUrl(url, 5, id)

    return randomPagesUrl.map(url => {
      return {
        url: url,
        id: 'primo-livello' + Date.now(),
        type:'first-level'
      }
    })
  }

  async getRandomFirstLevelPagesUrl(
    url: string,
    numberOfPages = 1,
    id: string
  ): Promise<string[]> {
    const page = await this.loadPageData(url);
    const pagesUrls = [
      ...new Set(
        await this.getHREFValuesDataAttribute(
          page,
          `[data-element="${primaryMenuDataElement}"]`
        )
      ),
    ];

    return pagesUrls
  };


}
