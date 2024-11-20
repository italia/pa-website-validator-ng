import { pageGatherer } from "../page/index.js";
import { Page } from "puppeteer";
import { PageData } from "../../types/crawler-types.js";
import { Gatherer } from "../Gatherer.js";
import { DataElementError } from "../../utils/DataElementError.js";
import {
  buildUrl,
  getRandomNString,
  isInternalUrl,
} from "../../utils/utils.js";
import { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio";

class secondLevelPagesGatherer extends pageGatherer {
  static pageType = "second-level";
  static dataElements = [
    "school-submenu",
    "teaching-submenu",
    "news-submenu",
    "services-submenu",
    "custom-submenu",
  ];
  static pageTitle: string = "Pagina di secondo livello";

  async navigateAndFetchPages(
    url: string,
    numberOfPages: number,
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) return this.gatheredPages;

    const currentClass = this.constructor as typeof Gatherer;

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    let fetchedUrls: string[] = [];

    const menuDataElements = [];
    for (const item of currentClass.dataElements) {
      menuDataElements.push(item);
    }

    for (const value of menuDataElements) {
      const dataElement = `[data-element="${value}"]`;

      let elements = $(dataElement);
      if (Object.keys(elements).length > 0) {
        elements = elements.find("li > a");
        for (const element of elements) {
          let secondLevelPageUrl = $(element).attr()?.href;
          if (
            secondLevelPageUrl &&
            secondLevelPageUrl !== "#" &&
            secondLevelPageUrl !== ""
          ) {
            if (
              (await isInternalUrl(secondLevelPageUrl)) &&
              !secondLevelPageUrl.includes(url)
            ) {
              secondLevelPageUrl = await buildUrl(url, secondLevelPageUrl);
            }

            fetchedUrls.push(secondLevelPageUrl);
          }
        }
      }
    }

    fetchedUrls = await getRandomNString(fetchedUrls, numberOfPages);

    if (!fetchedUrls.length) {
      throw new DataElementError(
        `Non è stato possibile trovare l'attributo ${currentClass.dataElements.toString()}`,
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

  static getInstance(): secondLevelPagesGatherer {
    if (!secondLevelPagesGatherer.instance) {
      secondLevelPagesGatherer.instance = new secondLevelPagesGatherer(
        "",
        3000,
      );
    }
    return secondLevelPagesGatherer.instance;
  }
}

export { secondLevelPagesGatherer };
export default secondLevelPagesGatherer.getInstance;
