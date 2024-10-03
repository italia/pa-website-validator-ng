import {Gatherer} from '../Gatherer.js'
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {Page} from "puppeteer";

class eventsPageGatherer extends Gatherer {

  static dataElements:string[] = ['live-button-events']
  static pageType:string = 'events-page'

  async navigateAndFetchPages(url: string, numberOfPages = 5, website = '',  page : Page): Promise<PageData[]> {
    if (this.gatheredPages.length >0) return this.gatheredPages

    const currentClass = this.constructor as typeof Gatherer

    let fetchedUrls:string[] = []
    for (let dataElement of currentClass.dataElements) {
      fetchedUrls = [...fetchedUrls,...await this.getButtonUrl(page,dataElement)]
    }
  
    this.gatheredPages = fetchedUrls.map((urlItem: any) => {
      return {
        url: urlItem,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited:false,
        internal: true,
        redirectUrl:''
      }
    })


    await page.close()
    return this.gatheredPages
  }

  static getInstance(): Promise<eventsPageGatherer> {
    if (!eventsPageGatherer.instance) {
      eventsPageGatherer.instance = new eventsPageGatherer('',3000);
    }
    return eventsPageGatherer.instance;
  }
}

export { eventsPageGatherer };
export default eventsPageGatherer.getInstance;
