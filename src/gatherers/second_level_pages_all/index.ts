import { Gatherer } from "../Gatherer.js";
import {MunicipalitySecondLevelPages, PageData, PageLink} from "../../types/crawler-types.js";
import { getSecondLevelPages } from "../../utils/municipality/utils.js";
import { primaryMenuItems } from "../../storage/municipality/menuItems.js";

class SecondLevelPagesGatherer extends Gatherer {
  static pageType: string = "second-level-page-all";

  static getInstance(): SecondLevelPagesGatherer {
    if (!SecondLevelPagesGatherer.instance) {
      SecondLevelPagesGatherer.instance = new SecondLevelPagesGatherer("");
    }
    return SecondLevelPagesGatherer.instance;
  }

  async navigateAndFetchPages(
    url: string,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

    const currentClass = this.constructor as typeof Gatherer;

    const pagesToBeAnalyzed = [];

    const fetchedUrls : MunicipalitySecondLevelPages = await getSecondLevelPages(url, false);

    for (const [key, primaryMenuItem] of Object.entries(primaryMenuItems)) {
      const secondLevelPagesSection : PageLink[] = fetchedUrls[key as keyof MunicipalitySecondLevelPages];
      for (const page of secondLevelPagesSection) {
        if (primaryMenuItem.dictionary.includes(page.linkName.toLowerCase())) {
          pagesToBeAnalyzed.push(page.linkUrl);
        }
      }
    }

    this.gatheredPages = pagesToBeAnalyzed.map((url: string) => {
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
