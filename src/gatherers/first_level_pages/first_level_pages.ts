import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

import {
  primaryMenuDataElement,
} from "../../storage/school/menuItems.js";


class firstLevelPagesGatherer extends Gatherer {

  static getInstance(): Promise<firstLevelPagesGatherer> {
    if (!firstLevelPagesGatherer.instance) {
      firstLevelPagesGatherer.instance = new firstLevelPagesGatherer('');
    }
    return firstLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(url: string, numberOfPages = 5): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages
    
    const page = await this.loadPage(url)
    const currentClass = this.constructor as typeof Gatherer

    let fetchedUrls:string[] = []
    for (let dataElement of currentClass.dataElements) {
      fetchedUrls = [...fetchedUrls,...await this.getDataElementUrls(page,dataElement)]
    }

    this.gatheredPages = fetchedUrls.map((url: any) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        'audited':false,
        internal: false,
        redirectUrl:''
      }
    })

    return this.gatheredPages

    // const randomPagesUrl = await this.getRandomFirstLevelPagesUrl(url, numberOfPages, '')

    // console.log(randomPagesUrl)
    // this.gatheredPages = randomPagesUrl.map((url: any) => {
    //   return {
    //     url: url,
    //     id: 'primo-livello' + Date.now(),
    //     type: 'first-level',
    //     'audited': false,
    //     internal: true,
    //     redirectUrl: ''
    //   }
    // })

    // return this.gatheredPages
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

export { firstLevelPagesGatherer };
export default firstLevelPagesGatherer.getInstance;




