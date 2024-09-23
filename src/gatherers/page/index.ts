import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

class pageGatherer extends Gatherer {

  static dataElements:string[] = []
  static pageType:string = ''

  async navigateAndFetchPages(url: string, numberOfPages = 5): Promise<PageData[]> {
    if (this.gatheredPages.length >0) return this.gatheredPages

    const page = await this.loadPage(url)
    const currentClass = this.constructor as typeof Gatherer

    let fetchedUrls:string[] = []
    for (let dataElement of currentClass.dataElements) {
      fetchedUrls = [...fetchedUrls,...await this.getDataElementUrls(page,dataElement)]
    }

    await page.close()    
    this.gatheredPages = fetchedUrls.map((url: any) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        'audited':false,
        internal: true,
        redirectUrl:''
      }
    })

    return this.gatheredPages
  }

  static getInstance(): Promise<pageGatherer> {
    if (!pageGatherer.instance) {
      pageGatherer.instance = new pageGatherer('',30000);
    }
    return pageGatherer.instance;
  }
}

export { pageGatherer };
export default pageGatherer.getInstance;
