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

class secondLevelPagesGatherer extends Gatherer {

  static pageType = 'second-level'
  static dataElements = [
    'school-submenu',
    'teaching-submenu',
    'news-submenu',
    'services-submenu'
  ]

  static getInstance(): Promise<secondLevelPagesGatherer> {
    if (!secondLevelPagesGatherer.instance) {
      secondLevelPagesGatherer.instance = new secondLevelPagesGatherer('',3000);
    }
    return secondLevelPagesGatherer.instance;
  }
}

export { secondLevelPagesGatherer };
export default secondLevelPagesGatherer.getInstance;
