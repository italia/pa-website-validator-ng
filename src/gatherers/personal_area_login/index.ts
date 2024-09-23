import {pageGatherer} from '../page/index.js'

class personalAreaPageGatherer extends pageGatherer {

  static dataElements:string[] = ['personal-area-login']
  static pageType:string = 'personal-area-login'

  static getInstance(): Promise<personalAreaPageGatherer> {
    if (!personalAreaPageGatherer.instance) {
      personalAreaPageGatherer.instance = new personalAreaPageGatherer('',3000);
    }
    return personalAreaPageGatherer.instance;
  }
}

export { personalAreaPageGatherer };
export default personalAreaPageGatherer.getInstance;
