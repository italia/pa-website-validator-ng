import {pageGatherer} from '../page/index.js'

class servicesPageGatherer extends pageGatherer {

  static dataElements:string[] = ['all-services']
  static pageType:string= 'services-page'

  static getInstance(): Promise<servicesPageGatherer> {
    if (!servicesPageGatherer.instance) {
      servicesPageGatherer.instance = new servicesPageGatherer('');
    }
    return servicesPageGatherer.instance;
  }
}

export { servicesPageGatherer };
export default servicesPageGatherer.getInstance;
