import {Gatherer} from '../Gatherer.js'
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

class locationsGatherer extends Gatherer {

  static dataElements:string[] = ['location-link']
  static pageType:string = 'location'

  async navigateAndFetchPages(url: string, numberOfPages = 5): Promise<PageData[]> {
    if (this.gatheredPages.length >0) return this.gatheredPages

    const page = await this.loadPage(url)
    const currentClass = this.constructor as typeof Gatherer

    let fetchedUrls:string[] = []
    for (let dataElement of currentClass.dataElements) {
      fetchedUrls = [...fetchedUrls,...await this.getMultipleDataElementUrls(page,dataElement) as any[]]
    }

    await page.close()

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
  }


  static getInstance(): Promise<locationsGatherer> {
    if (!locationsGatherer.instance) {
      locationsGatherer.instance = new locationsGatherer('');
    }
    return locationsGatherer.instance;
  }
}

export { locationsGatherer };
export default locationsGatherer.getInstance;