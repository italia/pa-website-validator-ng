import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";
import { Page } from "puppeteer";
import { getRandomNString, loadPage } from "../../utils/utils.js";

class servicesPageGatherer extends Gatherer {
  static dataElements: string[] = ["service-type"];
  static pageType: string = "service";
  static serviceDataElement = "service-link";

  async navigateAndFetchPages(
    url: string,
    numberOfPages: number,
    website: string,
    page: Page,
  ): Promise<PageData[]> {
    if (this.gatheredPages.length > 0) {
      return this.gatheredPages;
    }

    const currentClass = this.constructor as typeof Gatherer;
    let fetchedUrls: string[] = [];
    for (const dataElement of currentClass.dataElements) {
      fetchedUrls = [
        ...fetchedUrls,
        ...((await this.getMultipleDataElementUrls(
          page,
          dataElement,
        )) as string[]),
      ];
    }

    let servicesUrls: string[] = [];
    for (const fetchedUrl of fetchedUrls) {
      const servicePage = await loadPage(fetchedUrl);

      servicesUrls = [
        ...servicesUrls,
        ...((await this.getMultipleDataElementUrls(
          servicePage,
          servicesPageGatherer.serviceDataElement,
        )) as string[]),
      ];
      await servicePage.close();
    }

    servicesUrls = await getRandomNString(servicesUrls, numberOfPages);

    this.gatheredPages = servicesUrls.map((url) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited: false,
        redirectUrl: "",
        internal: true,
      };
    });

    return this.gatheredPages;
  }

  static getInstance(): servicesPageGatherer {
    if (!servicesPageGatherer.instance) {
      servicesPageGatherer.instance = new servicesPageGatherer("");
    }
    return servicesPageGatherer.instance;
  }
}

export { servicesPageGatherer };
export default servicesPageGatherer.getInstance;

// const getRandomServicesUrl = async (
//   url: string,
//   numberOfServices = 1
// ): Promise<string[]> => {
//   let $ = await loadPageData(url);

//   let serviceTypeUrls = await getHREFValuesDataAttribute(
//     $,
//     '[data-element="service-type"]'
//   );
//   if (serviceTypeUrls.length <= 0) {
//     throw new DataElementError("service-type");
//   }

//   serviceTypeUrls = [...new Set(serviceTypeUrls)];

//   let servicesUrls: string[] = [];
//   for (const serviceTypeUrl of serviceTypeUrls) {
//     const pagesToBeAnalyzed = [serviceTypeUrl];
//     const pagesAnalyzed = [];

//     while (pagesToBeAnalyzed.length > 0) {
//       let pageToBeAnalyzed: string = pagesToBeAnalyzed.pop() ?? "";
//       if (
//         (await isInternalUrl(pageToBeAnalyzed)) &&
//         !pageToBeAnalyzed.includes(url)
//       ) {
//         pageToBeAnalyzed = await buildUrl(url, pageToBeAnalyzed);
//       }

//       $ = await loadPageData(pageToBeAnalyzed);
//       servicesUrls = [
//         ...servicesUrls,
//         ...(await getHREFValuesDataAttribute(
//           $,
//           '[data-element="service-link"]'
//         )),
//       ];

//       pagesAnalyzed.push(pageToBeAnalyzed);

//       const pagerPagesUrls = [
//         ...new Set(
//           await getHREFValuesDataAttribute($, '[data-element="pager-link"]')
//         ),
//       ];
//       for (const pagerPageUrl of pagerPagesUrls) {
//         const pargerFullUrl = await buildUrl(url, pagerPageUrl);
//         if (
//           !pagesAnalyzed.includes(pargerFullUrl) &&
//           !pagesToBeAnalyzed.includes(pargerFullUrl)
//         ) {
//           pagesToBeAnalyzed.push(pagerPageUrl);
//         }
//       }
//     }
//   }

//   if (servicesUrls.length === 0) {
//     throw new DataElementError("service-link");
//   }

//   for (let i = 0; i < servicesUrls.length; i++) {
//     if (
//       (await isInternalUrl(servicesUrls[i])) &&
//       !servicesUrls[i].includes(url)
//     ) {
//       servicesUrls[i] = await buildUrl(url, servicesUrls[i]);
//     }
//   }

//   // Exclude external services
//   const host = new URL(url).hostname.replace("www.", "");
//   const internalServiceUrls = servicesUrls.filter((s) =>
//     new URL(s).hostname.replace("www.", "").includes(host)
//   );

//   return getRandomNString(internalServiceUrls, numberOfServices);
// // };
