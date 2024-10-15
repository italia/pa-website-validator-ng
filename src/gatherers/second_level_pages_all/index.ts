import { Gatherer } from "../Gatherer.js";
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData;
import { Page } from "puppeteer";
import { getSecondLevelPages } from "../../utils/municipality/utils.js";
import { primaryMenuItems } from "../../storage/municipality/menuItems.js";

class SecondLevelPagesGatherer extends Gatherer {
  static pageType: string = "second-level-page-all";

  static getInstance(): Promise<SecondLevelPagesGatherer> {
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

    let pagesToBeAnalyzed = [];

    let fetchedUrls: any = await getSecondLevelPages(url, false);

    for (const [key, primaryMenuItem] of Object.entries(primaryMenuItems)) {
      const secondLevelPagesSection: any = fetchedUrls[key];
      for (const page of secondLevelPagesSection) {
        if (primaryMenuItem.dictionary.includes(page.linkName.toLowerCase())) {
          pagesToBeAnalyzed.push(page.linkUrl);
        }
      }
    }

    this.gatheredPages = pagesToBeAnalyzed.map((url: any) => {
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
