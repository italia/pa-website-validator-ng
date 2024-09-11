import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

import {
  customPrimaryMenuItemsDataElement,
  menuItems,
  primaryMenuDataElement,
  primaryMenuItems,
} from "../../storage/school/menuItems.js";


export class firstLevelPagesGatherer extends Gatherer {

  static getInstance(): Promise<firstLevelPagesGatherer> {
     if (!firstLevelPagesGatherer.instance) {
      firstLevelPagesGatherer.instance = new firstLevelPagesGatherer('e3r23', 3000);
    }
    return firstLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(url: string, numberOfPages=5): Promise<PageData[]> {
    if (this.gatheredPages.length >0) return this.gatheredPages

    const randomPagesUrl = await this.getRandomFirstLevelPagesUrl(url, numberOfPages, '')


    console.log(randomPagesUrl)
    this.gatheredPages = randomPagesUrl.map((url: any) => {
      return {
        url: url,
        id: 'primo-livello' + Date.now(),
        type: 'first-level',
        'audited':false,
        'scanned':false,
        internal: true,
        redirectUrl:''
      }
    })

    return this.gatheredPages
  }

  async getRandomFirstLevelPagesUrl(
    url: string,
    numberOfPages = 1,
    id: string
  ): Promise<string[]> {
    const page = await this.loadPage(url);
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



