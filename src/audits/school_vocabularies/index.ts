"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import {areAllElementsInVocabulary} from "../../utils/utils";
import {schoolModelVocabulary} from "./controlledVocabulary.js";

const auditId = "school-controlled-vocabularies";
const auditData = auditDictionary[auditId];

class SchoolVocabularies extends Audit {
  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    errorMessage: ''
  };

  private headings : any = [];

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
      page: Page | null,
      error?: string,
  ) {

    if(error && !page){

      this.globalResults.score = 0;
      this.globalResults.details.items.push([
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ]);
      this.globalResults.details.headings= [{ key: "result", itemType: "text", text: "Risultato" }];

      return {
        score: 0,
      }
    }

    if(page){
      const url = page.url();

      this.headings = [
        { key: "result", itemType: "text", text: "Risultato" },
        {
          key: "element_in_school_model_percentage",
          itemType: "text",
          text: "% di argomenti presenti nell'elenco del modello",
        },
        {
          key: "element_not_in_school_model",
          itemType: "text",
          text: "Argomenti non presenti nell'elenco del modello",
        },
      ];

      const item = [
        {
          result: auditData.redResult,
          element_in_school_model_percentage: "",
          element_not_in_school_model: "",
        },
      ];

      let argumentsElements: string[] = [];
      try {
        //argumentsElements = await getArgumentsElements(url);  TODO
      } catch (e) {
        // return {  TODO
        //   score: 0,
        //   details: Audit.makeTableDetails(
        //       [{ key: "result", itemType: "text", text: "Risultato" }],
        //       [{ result: notExecutedErrorMessage.replace("<LIST>", "all-topics") }]
        //   ),
        // };
      }

      if (argumentsElements.length <= 0) {
        // return {  TODO
        //   score: 0,
        //   details: Audit.makeTableDetails(
        //       [{ key: "result", itemType: "text", text: "Risultato" }],
        //       [{ result: notExecutedErrorMessage.replace("<LIST>", "all-topics") }]
        //   ),
        // };
      }

      const schoolModelCheck = await areAllElementsInVocabulary(
          argumentsElements,
          schoolModelVocabulary
      );

      let numberOfElementsNotInScuoleModelPercentage = 100;

      if (argumentsElements.length > 0) {
        numberOfElementsNotInScuoleModelPercentage =
            (schoolModelCheck.elementNotIncluded.length /
                argumentsElements.length) *
            100;
      }

      let score = 0;
      if (schoolModelCheck.allArgumentsInVocabulary) {
        item[0].result = auditData.greenResult;
        score = 1;
      } else if (numberOfElementsNotInScuoleModelPercentage <= 50) {
        item[0].result = auditData.yellowResult;
        score = 0.5;
      }

      item[0].element_in_school_model_percentage =
          (100 - numberOfElementsNotInScuoleModelPercentage).toFixed(0).toString() +
          "%";
      item[0].element_not_in_school_model =
          schoolModelCheck.elementNotIncluded.join(", ");

      this.globalResults.score = score;
      this.globalResults.details.items = item;
      this.globalResults.details.headings = this.headings;

      return {
        score: score,
      };
    }
  }

  async getType(){
    return auditId;
  }

  async returnGlobal(){
    return this.globalResults;
  }

  static getInstance(): Promise<SchoolVocabularies> {
    if (!SchoolVocabularies.instance) {
      SchoolVocabularies.instance = new SchoolVocabularies('',[],[]);
    }
    return SchoolVocabularies.instance;
  }

}

export {SchoolVocabularies};
export default SchoolVocabularies.getInstance;

// async function getArgumentsElements(url: string): Promise<string[]> {
//   let elements: string[] = [];
//   const browser = await puppeteer.launch({
//     headless: "new",
//     protocolTimeout: requestTimeout,
//     args: ["--no-zygote", "--no-sandbox", "--accept-lang=it"],
//   });
//   const browserWSEndpoint = browser.wsEndpoint();
//
//   try {
//     const browser2 = await puppeteer.connect({ browserWSEndpoint });
//     const page = await browser2.newPage();
//
//     await page.setRequestInterception(true);
//     page.on("request", (request) => {
//       if (
//           ["image", "imageset", "media"].indexOf(request.resourceType()) !== -1 ||
//           new URL(request.url()).pathname.endsWith(".pdf")
//       ) {
//         request.abort();
//       } else {
//         request.continue();
//       }
//     });
//
//     const res = await gotoRetry(page, url, errorHandling.gotoRetryTentative);
//     console.log(res?.url(), res?.status());
//
//     await page.waitForSelector('[data-element="search-modal-button"]');
//
//     await page.$eval(
//         '[data-element="search-modal-button"]',
//         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//         //@ts-ignore
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         (el: any) => (el.value = "scuola")
//     );
//
//     const button = await page.$('[data-element="search-submit"]');
//     if (!button) {
//       return elements;
//     }
//
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     //@ts-ignore
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     await button?.evaluate((b: any) => b.click());
//
//     await page.waitForSelector('[data-element="all-topics"]');
//
//     const $ = cheerio.load(await page.content());
//     if ($.length <= 0) {
//       await browser.close();
//       return elements;
//     }
//
//     elements = await getPageElementDataAttribute(
//         $,
//         '[data-element="all-topics"]',
//         "li"
//     );
//
//     await page.goto("about:blank");
//     await page.close();
//     browser2.disconnect();
//
//     return elements;
//   } catch (ex) {
//     console.error(`ERROR ${url}: ${ex}`);
//     await browser.close();
//     throw new Error(
//         `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`
//     );
//   }
// }
