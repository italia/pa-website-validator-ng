import { pageGatherer } from "../page/index.js";

class viverePageGatherer extends pageGatherer {
  static dataElements: string[] = ["live"];
  static pageType: string = "vivere-page";
  static pageTitle: string = "Vivere il comune";

  static getInstance(): viverePageGatherer {
    if (!viverePageGatherer.instance) {
      viverePageGatherer.instance = new viverePageGatherer("", 3000);
    }
    return viverePageGatherer.instance;
  }
}

export { viverePageGatherer };
export default viverePageGatherer.getInstance;
