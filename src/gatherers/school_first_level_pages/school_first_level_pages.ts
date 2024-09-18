import {Gatherer} from '../Gatherer.js'
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

class firstLevelPageGatherer extends Gatherer {

  static dataElements:string[] = ['overview']
  static pageType:string= 'first-level'

  async navigateAndFetchPages(url: string, numberOfPages = 5, website: string): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) {
        return this.gatheredPages
    }

    const page = await this.loadPage(url)
    const currentClass = this.constructor as typeof Gatherer
    let fetchedUrls:string[] = []
    for (let dataElement of currentClass.dataElements) {
      fetchedUrls = [...fetchedUrls,...await this.getMultipleDataElementUrls(page,dataElement) as string[]]
    }

    await page.close()

    this.gatheredPages = fetchedUrls.map(url => {
        return {
            url: url,
            id: currentClass.pageType + Date.now(),
            type: currentClass.pageType,
            audited: false,
            redirectUrl: '',
            internal: true
        }
    })

    return this.gatheredPages
}

  static getInstance(): Promise<firstLevelPageGatherer> {
    if (!firstLevelPageGatherer.instance) {
      firstLevelPageGatherer.instance = new firstLevelPageGatherer('');
    }
    return firstLevelPageGatherer.instance;
  }
}

export { firstLevelPageGatherer };
export default firstLevelPageGatherer.getInstance;