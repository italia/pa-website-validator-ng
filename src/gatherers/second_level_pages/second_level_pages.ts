import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import puppeteer, { HTTPResponse, JSHandle, Page, ElementHandle } from "puppeteer";
import requestPages = crawlerTypes.requestPages;
import pageLink = crawlerTypes.pageLink;
import {
  customPrimaryMenuItemsDataElement,
  menuItems,
  primaryMenuDataElement,
  primaryMenuItems,
} from "../../storage/school/menuItems.js";
interface PageData {
  id: string;
  url: string;
}

export class secondLevelPagesGatherer extends Gatherer {

  async navigateAndFetchPages(url: string, pagesToBeAnalyzed: any[], id: string): Promise<PageData[]> {
    const randomPagesUrl = await this.getRandomSecondLevelPagesUrl(url, 5, id)

    return randomPagesUrl.map(url => {
      return {
        url: url,
        id: 'secondo-livello' + Date.now(),
        type:'second-level'
      }
    })
  }

  async getRandomSecondLevelPagesUrl(
    url: string,
    numberOfPages = 1,
    id: string
  ): Promise<string[]>  {
    let pagesUrls: string[] = [];
    const page = await this.loadPageData(url);
  
    const menuDataElements:any[] = [];
    for (const [, value] of Object.entries(menuItems)) {
      menuDataElements.push(value.data_element);
    }
  
    menuDataElements.push(customPrimaryMenuItemsDataElement);
  
    const host = new URL(url).hostname.replace("www.", "");
  
    for (const value of menuDataElements) {
      const dataElement = `[data-element="${value}"]`;
      const elementWithAtrr = await page.$(dataElement);

      const secondLevelPagesUrls: any[] = [];

      if (!elementWithAtrr) continue;

      const elements = await elementWithAtrr.$$eval('li > a', (links:any[]) => {
        return links.map((link:any) => ({
          href: link.href,
          textContent: link.textContent
        }));
      });

      if (Object.keys(elements).length > 0) {

        for (const element of elements) {
          let secondLevelPageUrl= element.href

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
  
            const secondLevelPageHost = new URL(
              secondLevelPageUrl
            ).hostname.replace("www.", "");
  
            if (secondLevelPageHost.includes(host)) {
              secondLevelPagesUrls.push(secondLevelPageUrl);
            }
          }
        }
      }
  
      if (
        secondLevelPagesUrls.length === 0 &&
        value !== customPrimaryMenuItemsDataElement
      ) {
        throw new Error(value);
      }
  
      pagesUrls = [...pagesUrls, ...new Set(secondLevelPagesUrls)];
    }
  
    return getRandomNString(pagesUrls, numberOfPages);
  };

}

const isInternalUrl = async (url: string) => {
  return (
    !url.includes("www") && !url.includes("http") && !url.includes("https")
  );
};

const buildUrl = async (url: string, path: string): Promise<string> => {
  return new URL(path, url).href;
};

const getRandomNString = async (array: string[], numberOfElements: number) => {
  if (array.length <= 0) {
    return [];
  }

  array = [...new Set(array)];

  if (numberOfElements > array.length || numberOfElements === -1) {
    return array;
  }

  array = array.sort(() => Math.random() - 0.5);
  array = array.slice(0, numberOfElements);

  return array;
};