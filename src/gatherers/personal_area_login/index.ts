import { pageGatherer } from "../page/index.js";

class personalAreaPageGatherer extends pageGatherer {
  static dataElements: string[] = ["personal-area-login"];
  static pageType: string = "personal-area-login";
  static pageTitle: string = "Login area personale";

  static getInstance(): personalAreaPageGatherer {
    if (!personalAreaPageGatherer.instance) {
      personalAreaPageGatherer.instance = new personalAreaPageGatherer(
        "",
        3000,
      );
    }
    return personalAreaPageGatherer.instance;
  }
}

export { personalAreaPageGatherer };
export default personalAreaPageGatherer.getInstance;
