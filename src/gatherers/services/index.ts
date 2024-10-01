import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import { setTimeout } from "timers/promises";
import {Page} from "puppeteer";
import {config} from "../../config/config.js";
import {createArraySubset} from "../../utils/utils.js";

const accuracy = process.env["accuracy"] ?? "suggested";

const auditVariables = config['accuracy'][accuracy];

const numberOfServicesToBeScanned = process.env["numberOfServicePages"]
    ? JSON.parse(process.env["numberOfServicePages"])
    : auditVariables.numberOfServicesToBeScanned;


class servicesGatherer extends Gatherer {

  static dataElement: string = 'service-link'
  static pageType: string = 'service'

  async navigateAndFetchPages(url: string, numberOfPages = 5, website: '', page : Page ): Promise<PageData[]> {

    let maxCountPages = 0;
    let clickButton = true;
    let foundElements:any = [];
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

        this.gatheredPages = foundElementsHrefs
   
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
      throw new Error(`Cannot find elements with data-element "${servicesGatherer.dataElement} ${maxCountPages} ${error}"`);
    }

    this.gatheredPages = createArraySubset(this.gatheredPages, numberOfServicesToBeScanned);

    this.gatheredPages = this.gatheredPages.map((url:any)=>{
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
