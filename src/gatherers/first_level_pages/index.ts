import { Gatherer } from "../Gatherer.js";
import {PageData} from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import { getRandomFirstLevelPagesUrl } from "../../utils/municipality/utils.js";

class firstLevelPagesGatherer extends Gatherer {
  static dataElements: string[] = ["custom-submenu"];
  static pageType: string = "first-level-page";

  static getInstance(): Promise<firstLevelPagesGatherer> {
    if (!firstLevelPagesGatherer.instance) {
      firstLevelPagesGatherer.instance = new firstLevelPagesGatherer("");
    }
    return firstLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    website: "",
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

    const currentClass = this.constructor as typeof Gatherer;

    const fetchedUrls: string[] = await getRandomFirstLevelPagesUrl(
      url,
      numberOfPages,
      page,
    );

    this.gatheredPages = fetchedUrls.map((url: any) => {
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

export { firstLevelPagesGatherer };
export default firstLevelPagesGatherer.getInstance;
