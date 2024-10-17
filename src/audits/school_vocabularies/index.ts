"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { Page, ElementHandle } from "puppeteer";
import * as cheerio from "cheerio";
import {Audit, GlobalResults} from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import {
  areAllElementsInVocabulary,
  getPageElementDataAttribute,
} from "../../utils/utils.js";
import { schoolModelVocabulary } from "./controlledVocabulary.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolVocabularies extends Audit {
  public globalResults: GlobalResults = {
    score: 0,
    details: {
      items: [],
      type: "table",
      summary: "",
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  auditId = "school-controlled-vocabularies";
  auditData = auditDictionary["school-controlled-vocabularies"];
  code = "R.SC.1.1";
  mainTitle = "VOCABOLARI CONTROLLATI";

  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    if (error && !page) {
      this.globalResults.score = 0;
      this.globalResults.pagesItems.headings = ["Risultato"];
      this.globalResults.pagesItems.message = notExecutedErrorMessage.replace(
        "<LIST>",
        error,
      );
      this.globalResults.pagesItems.pages = [
        {
          result: this.auditData.redResult,
        },
      ];

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      const item = [
        {
          result: this.auditData.redResult,
          element_in_school_model_percentage: "",
          element_not_in_school_model: "",
        },
      ];

      let argumentsElements: string[] = [];
      try {
        argumentsElements = await getArgumentsElements(url, page);
      } catch {
          this.globalResults.score = 0;
          this.globalResults.pagesItems.pages = [
              {
                  result: notExecutedErrorMessage.replace("<LIST>", "all-topics"),
              }
          ];
          this.globalResults.pagesItems.headings = ['Risultato'];

        return {
          score: 0,
          details: {
              type: "table",
            headings: [{ key: "result", itemType: "text", text: "Risultato" }],
            summary: "",
          },
        };
      }

      if (argumentsElements.length <= 0) {
          this.globalResults.score = 0;
          this.globalResults.pagesItems.pages = [
              {
                  result: notExecutedErrorMessage.replace("<LIST>", "all-topics"),
              }
          ];
          this.globalResults.pagesItems.headings = ['Risultato'];

        return {
          score: 0,
          details: {
            type: "table",
            headings: [{ key: "result", itemType: "text", text: "Risultato" }],
            summary: "",
          },
        };
      }

      const schoolModelCheck = await areAllElementsInVocabulary(
        argumentsElements,
        schoolModelVocabulary,
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
        (100 - numberOfElementsNotInScuoleModelPercentage)
          .toFixed(0)
          .toString() + "%";
      item[0].element_not_in_school_model =
        schoolModelCheck.elementNotIncluded.join(", ");

      this.globalResults.score = score;
      this.globalResults.details.items = item;
      this.globalResults.pagesItems.pages = item;
      this.globalResults.pagesItems.headings = [
        "Risultato",
        "% di argomenti presenti nell'elenco del modello",
        "Argomenti non presenti nell'elenco del modello",
      ];
      this.globalResults.id = this.auditId;

      return {
        score: score,
      };
    }
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = "average";
      message = this.auditData.yellowResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): SchoolVocabularies {
    if (!SchoolVocabularies.instance) {
      SchoolVocabularies.instance = new SchoolVocabularies();
    }
    return <SchoolVocabularies>SchoolVocabularies.instance;
  }
}

export { SchoolVocabularies };
export default SchoolVocabularies.getInstance;

async function getArgumentsElements(
  url: string,
  page: Page,
): Promise<string[]> {
  let elements: string[] = [];

  try {
    await page.waitForSelector('[data-element="search-modal-button"]');

    await page.$eval(
        '[data-element="search-modal-input"]',
        (el: Element) => {
          if (el instanceof HTMLInputElement) {
            el.value = "scuola";
          } else {
            console.warn("L'elemento selezionato non è un input.");
          }
        }
    );

    const button: ElementHandle<Element> | null = await page.$('[data-element="search-submit"]');

    if (!button) {
      return elements;
    }

    await button.evaluate((b) => {
      const buttonElement = b as HTMLButtonElement;
      buttonElement.click();
    });

    await page.waitForSelector('[data-element="all-topics"]');

    const $ = cheerio.load(await page.content());
    if ($.length <= 0) {
      return elements;
    }

    elements = await getPageElementDataAttribute(
      $,
      '[data-element="all-topics"]',
      "li",
    );

    return elements;
  } catch (ex) {
    console.error(`ERROR ${url}: ${ex}`);
    throw new Error(
      `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`,
    );
  }
}
