import { Gatherer } from "../Gatherer.js";

class secondLevelPagesGatherer extends Gatherer {
  static pageType = "second-level";
  static dataElements = [
    "school-submenu",
    "teaching-submenu",
    "news-submenu",
    "services-submenu",
  ];

  static getInstance(): Promise<secondLevelPagesGatherer> {
    if (!secondLevelPagesGatherer.instance) {
      secondLevelPagesGatherer.instance = new secondLevelPagesGatherer(
        "",
        3000,
      );
    }
    return secondLevelPagesGatherer.instance;
  }
}

export { secondLevelPagesGatherer };
export default secondLevelPagesGatherer.getInstance;
