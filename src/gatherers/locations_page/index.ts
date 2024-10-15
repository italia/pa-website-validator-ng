import { pageGatherer } from "../page/index.js";

class locationsPageGatherer extends pageGatherer {
  static dataElements: string[] = ["school-locations"];
  static pageType: string = "locations-page";

  static getInstance(): Promise<locationsPageGatherer> {
    if (!locationsPageGatherer.instance) {
      locationsPageGatherer.instance = new locationsPageGatherer("");
    }
    return locationsPageGatherer.instance;
  }
}

export { locationsPageGatherer };
export default locationsPageGatherer.getInstance;
