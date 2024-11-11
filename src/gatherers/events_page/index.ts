import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import { DataElementError } from "../../utils/DataElementError.js";

class eventsPageGatherer extends Gatherer {
  static dataElements: string[] = ["live-button-events"];
  static pageType: string = "events-page";
  static pageTitle: string = "Pagina eventi";

  async navigateAndFetchPages(
    url: string,
    numberOfPages: number,
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

    const currentClass = this.constructor as typeof Gatherer;

    let fetchedUrls: string[] = [];
    for (const dataElement of currentClass.dataElements) {
      fetchedUrls = [
        ...fetchedUrls,
        ...(await this.getButtonUrl(page, dataElement)),
      ];
    }

    if (!fetchedUrls.length) {
      throw new DataElementError(
        `Non è stato possibile trovare l'attributo [data-element="live-button-events"]`,
      );
    }

    this.gatheredPages = fetchedUrls.map((url: string) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited: false,
      };
    });

    return this.gatheredPages;
  }

  static getInstance(): eventsPageGatherer {
    if (!eventsPageGatherer.instance) {
      eventsPageGatherer.instance = new eventsPageGatherer("", 3000);
    }
    return eventsPageGatherer.instance;
  }
}

export { eventsPageGatherer };
export default eventsPageGatherer.getInstance;
