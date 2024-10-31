import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import { getRandomSecondLevelPagesUrl } from "../../utils/municipality/utils.js";
import { DataElementError } from "../../utils/DataElementError.js";

class SecondLevelPagesGatherer extends Gatherer {
  static dataElements: string[] = ["custom-submenu"];
  static pageType: string = "second-level-page";
  static pageTitle: string = 'Pagina di secondo livello';

  static getInstance(): SecondLevelPagesGatherer {
    if (!SecondLevelPagesGatherer.instance) {
      SecondLevelPagesGatherer.instance = new SecondLevelPagesGatherer("");
    }
    return SecondLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(
    url: string,
    numberOfPages = 5,
    website: "",
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

    const currentClass = this.constructor as typeof Gatherer;

    let fetchedUrls: string[] = [];
    fetchedUrls = await getRandomSecondLevelPagesUrl(url, numberOfPages, page);

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
        internal: true,
        redirectUrl: "",
      };
    });

    return this.gatheredPages;
  }
}

export { SecondLevelPagesGatherer };
export default SecondLevelPagesGatherer.getInstance;
