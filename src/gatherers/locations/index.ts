import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";

class locationsGatherer extends Gatherer {
  static dataElements: string[] = ["location-link"];
  static pageType: string = "location";

  async navigateAndFetchPages(
    url: string,
    numberOfPages: number,
    website: string,
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

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

    this.gatheredPages = fetchedUrls.map((url: string) => {
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
  }

  static getInstance(): locationsGatherer {
    if (!locationsGatherer.instance) {
      locationsGatherer.instance = new locationsGatherer("");
    }
    return locationsGatherer.instance;
  }
}

export { locationsGatherer };
export default locationsGatherer.getInstance;
