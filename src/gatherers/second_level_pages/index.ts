import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {Page} from "puppeteer";
import {getRandomSecondLevelPagesUrl} from "../../utils/municipality/utils.js";

class SecondLevelPagesGatherer extends Gatherer {

  static dataElements:string[] = ['custom-submenu']
  static pageType:string= 'second-level-page'

  static getInstance(): Promise<SecondLevelPagesGatherer> {
    if (!SecondLevelPagesGatherer.instance) {
      SecondLevelPagesGatherer.instance = new SecondLevelPagesGatherer('');
    }
    return SecondLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(url: string, numberOfPages = 5,  website: '', page : Page): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages

    const currentClass = this.constructor as typeof Gatherer;

    let fetchedUrls:string[] = await getRandomSecondLevelPagesUrl(url, numberOfPages, page)

    this.gatheredPages = fetchedUrls.map((url: any) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited:false,
        internal: true,
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


}

export { SecondLevelPagesGatherer };
export default SecondLevelPagesGatherer.getInstance;




