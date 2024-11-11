import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import { getRandomFirstLevelPagesUrl } from "../../utils/municipality/utils.js";
import { DataElementError } from "../../utils/DataElementError.js";

class firstLevelPagesGatherer extends Gatherer {
  static dataElements: string[] = ["custom-submenu"];
  static pageType: string = "first-level-page";
  static pageTitle: string = "Pagina di primo livello";

  static getInstance(): firstLevelPagesGatherer {
    if (!firstLevelPagesGatherer.instance) {
      firstLevelPagesGatherer.instance = new firstLevelPagesGatherer("");
    }
    return firstLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

    const currentClass = this.constructor as typeof Gatherer;
    let fetchedUrls: string[] = [];

    fetchedUrls = await getRandomFirstLevelPagesUrl(url, numberOfPages, page);

    if (!fetchedUrls.length) {
      throw new DataElementError(
        `Non è stato possibile trovare l'attributo [data-element="custom-submenu"]`,
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
}

export { firstLevelPagesGatherer };
export default firstLevelPagesGatherer.getInstance;
