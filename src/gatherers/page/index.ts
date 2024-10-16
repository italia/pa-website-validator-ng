import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";

const requestTimeout = parseInt(process.env["requestTimeout"] ?? "300000");

class pageGatherer extends Gatherer {
  static dataElements: string[] = [];
  static pageType: string = "";

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
        ...(await this.getDataElementUrls(page, dataElement)),
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

  static getInstance(): pageGatherer {
    if (!pageGatherer.instance) {
      pageGatherer.instance = new pageGatherer("", requestTimeout);
    }
    return pageGatherer.instance;
  }
}

export { pageGatherer };
export default pageGatherer.getInstance;
