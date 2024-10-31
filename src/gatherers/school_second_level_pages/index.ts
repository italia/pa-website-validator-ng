import { pageGatherer } from "../page/index.js";

class secondLevelPagesGatherer extends pageGatherer {
  static pageType = "second-level";
  static dataElements = [
    "school-submenu",
    "teaching-submenu",
    "news-submenu",
    "services-submenu",
  ];
  static pageTitle: string = "Pagina di secondo livello";

  static getInstance(): secondLevelPagesGatherer {
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
