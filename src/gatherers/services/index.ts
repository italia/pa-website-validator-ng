import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import { setTimeout } from "timers/promises";
import {Page} from "puppeteer";
import { getRandomNString} from "../../utils/utils.js";
import {config} from "../../config/config.js";

class servicesGatherer extends Gatherer {

  static dataElement: string = 'service-link'
  static pageType: string = 'service'

  async navigateAndFetchPages(url: string, numberOfPages = 5, website: '', page : Page ): Promise<PageData[]> {

    let maxCountPages = 0;
    let clickButton = true;
    let foundElements:any = [];
    let pages : string[] = [];
    let error = '';
    while (clickButton) {
      try {
        let clickButton : any = await page.$$('[data-element="load-other-cards"]');
  
        if (!clickButton) {
          continue;
        }

        await page.click('[data-element="load-other-cards"]', {delay:1000});
        await Promise.race([
          setTimeout(1000),
          page.waitForNetworkIdle({
            idleTime: 1000,
          }),
        ]);

        await page.waitForNetworkIdle();

        foundElements = await page.$$(`[data-element="${servicesGatherer.dataElement}"`)
        const foundElementsHrefs:PageData[] | any =await  Promise.all( foundElements.map(async(el:any) => {
              const href = await el.getProperty('href');
              const hrefValue = await href.jsonValue() 
              return hrefValue
        }))

        pages = foundElementsHrefs
   
        let currentCountPages = foundElements.length
        if (!currentCountPages || currentCountPages.length === maxCountPages) {
          clickButton = false;
          continue;
        }

        maxCountPages = currentCountPages
      } catch (e) {
        clickButton = false;
      }
    }

    if (!maxCountPages || maxCountPages == 0) {
      await page.close()
      throw new Error(`Cannot find elements with data-element "${servicesGatherer.dataElement} ${maxCountPages}"`);
    }

    pages = await getRandomNString(pages, numberOfPages);

    this.gatheredPages = pages.map((url:any)=>{
        return {
          url: url,
          id: 'service' + Date.now(),
          type: 'service',
          gathered: false,
          audited:false,
          internal: true,
          redirectUrl:''
        } as PageData
    })





    //console.log('HREF', this.gatheredPages[0])
    
    await page.close()
    return this.gatheredPages
  }

  static getInstance(): Promise<servicesGatherer> {
    if (!servicesGatherer.instance) {
      servicesGatherer.instance = new servicesGatherer('', 3000);
    }
    return servicesGatherer.instance;
  }

}

export { servicesGatherer };
export default servicesGatherer.getInstance;
