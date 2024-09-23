import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import { setTimeout } from "timers/promises";


class servicesGatherer extends Gatherer {

  static dataElement: string = 'service-link'
  static pageType: string = 'service'

  async navigateAndFetchPages(url: string, numberOfPages = 5): Promise<PageData[]> {
    /** load events page */
    const page = await this.loadPage(url)

    let maxCountPages = 0;
    let clickButton = true;
    let foundElements:any = []
    while (clickButton) {
      try {
        let clickButton = await page.$$('[data-element="load-other-cards"]')
  
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
      throw new Error(`Cannot find elements with data-element "${servicesGatherer.dataElement}"`)
    }

    //console.log(this.gatheredPages)
    this.gatheredPages = this.gatheredPages.map((url:any)=>{
        return {
          url: url,
          id: 'service' + Date.now(),
          type: 'service',
          'audited':false,
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
