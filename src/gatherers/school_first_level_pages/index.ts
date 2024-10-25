import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import { getRandomNString } from "../../utils/utils.js";
import {DataElementError} from "../../utils/DataElementError";

class firstLevelPageGatherer extends Gatherer {
  static dataElements: string[] = ["overview"];
  static pageType: string = "first-level";

  async navigateAndFetchPages(
    url: string,
    numberOfPages: number,
    website: string,
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) {
      return this.gatheredPages;
    }
    const currentClass = this.constructor as typeof Gatherer;
    let fetchedUrls: string[] = [];
    for (const dataElement of currentClass.dataElements) {
      fetchedUrls = [
        ...fetchedUrls,
        ...((await this.getMultipleDataElementUrls(
          page,
          dataElement,
        )) as string[]),
      ];
    }

    fetchedUrls = await getRandomNString(fetchedUrls, numberOfPages);

    if(!fetchedUrls.length){
      throw new DataElementError(
          `Non è stato possibile trovare l'attributo [data-element="overview"]`,
      );
    }

    this.gatheredPages = fetchedUrls.map((url) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited: false,
        redirectUrl: "",
        internal: true,
      };
    });

    return this.gatheredPages;
  }

  static getInstance(): firstLevelPageGatherer {
    if (!firstLevelPageGatherer.instance) {
      firstLevelPageGatherer.instance = new firstLevelPageGatherer("");
    }
    return firstLevelPageGatherer.instance;
  }
}

export { firstLevelPageGatherer };
export default firstLevelPageGatherer.getInstance;
