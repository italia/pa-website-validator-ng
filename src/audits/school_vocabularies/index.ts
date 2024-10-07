"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";
import { browser } from './../../PuppeteerInstance.js'
import {Audit} from "../Audit.js";
import {errorHandling, notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import {areAllElementsInVocabulary, getPageElementDataAttribute, gotoRetry} from "../../utils/utils.js";
import {schoolModelVocabulary} from "./controlledVocabulary.js";

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
  static auditId = "school-controlled-vocabularies";
  static auditData = auditDictionary["school-controlled-vocabularies"];

  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
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
          result: this.auditData.redResult,
          element_in_school_model_percentage: "",
          element_not_in_school_model: "",
        },
      ];

      let argumentsElements: string[] = [];
      try {
        argumentsElements = await getArgumentsElements(url);
      } catch (e) {
        return {
          score: 0,
          details: {  items: [{ result: notExecutedErrorMessage.replace("<LIST>", "all-topics") }],  type: 'table',  headings: [{ key: "result", itemType: "text", text: "Risultato" }],  summary: ''},
        };
      }

      if (argumentsElements.length <= 0) {
        return {
          score: 0,
          details: {  items: [{ result: notExecutedErrorMessage.replace("<LIST>", "all-topics") }],  type: 'table',  headings: [{ key: "result", itemType: "text", text: "Risultato" }],  summary: ''},
        };
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
        item[0].result = this.auditData.greenResult;
        score = 1;
      } else if (numberOfElementsNotInScuoleModelPercentage <= 50) {
        item[0].result = this.auditData.yellowResult;
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
      this.globalResults.id = this.auditId;

      return {
        score: score,
      };
    }
  }

  async getType(){
    return this.auditId;
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

async function getArgumentsElements(url: string): Promise<string[]> {
  let elements: string[] = [];

  try {
    const page = await browser.newPage();

    const res = await gotoRetry(page, url, errorHandling.gotoRetryTentative);
    console.log(res?.url(), res?.status());

    await page.waitForSelector('[data-element="search-modal-button"]');

    await page.$eval(
        '[data-element="search-modal-button"]',
        (el: any) => (el.value = "scuola")
    );

    const button = await page.$('[data-element="search-submit"]');
    if (!button) {
      return elements;
    }

    await button?.evaluate((b: any) => b.click());

    await page.waitForSelector('[data-element="all-topics"]');

    const $ = cheerio.load(await page.content());
    if ($.length <= 0) {
      await browser.close();
      return elements;
    }

    elements = await getPageElementDataAttribute(
        $,
        '[data-element="all-topics"]',
        "li"
    );

    await page.goto("about:blank");
    await page.close();

    return elements;
  } catch (ex) {
    console.error(`ERROR ${url}: ${ex}`);
    await browser.close();
    throw new Error(
        `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`
    );
  }
}
