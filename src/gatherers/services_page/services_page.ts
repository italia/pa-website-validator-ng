import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

class servicesPageGatherer extends Gatherer {

  static servicesPageDataElement = "all-services"

  async navigateAndFetchPages(url: string, numberOfPages = 5): Promise<PageData[]> {
    if (this.gatheredPages.length >0) return this.gatheredPages

    const servicesPage = await this.getPrimaryPageUrl(
      url,
      servicesPageGatherer.servicesPageDataElement
    );

    if (servicesPage === "") {
      throw new Error(servicesPageGatherer.servicesPageDataElement);
    }

    const requestedPages = [servicesPage];
    console.log(requestedPages)

    this.gatheredPages = requestedPages.map((url: any) => {
      return {
        url: url,
        id: 'services-page' + Date.now(),
        type: 'services-page',
        'audited':false,
        'scanned':false,
        internal: false,
        redirectUrl:''
      }
    })

    return this.gatheredPages
  }

  static getInstance(): Promise<servicesPageGatherer> {
    if (!servicesPageGatherer.instance) {
      servicesPageGatherer.instance = new servicesPageGatherer('',3000);
    }
    return servicesPageGatherer.instance;
  }
}

export { servicesPageGatherer };
export default servicesPageGatherer.getInstance;
