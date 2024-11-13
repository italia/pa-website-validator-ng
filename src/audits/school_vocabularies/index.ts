"use strict";

import { Page, ElementHandle } from "puppeteer";
import * as cheerio from "cheerio";
import { Audit, GlobalResults } from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import {
  areAllElementsInVocabulary,
  getPageElementDataAttribute,
} from "../../utils/utils.js";
import { schoolModelVocabulary } from "./controlledVocabulary.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_vocabularies";

class SchoolVocabularies extends Audit {
  info = true;
  public globalResults: GlobalResults = {
    score: 0,
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
    info: true,
  };

  auditId = "school-controlled-vocabularies";
  greenResult =
    "Tutti gli argomenti appartengono all’elenco di voci del modello e l'elenco degli argomenti è presente nella pagina dei risultati di ricerca.";
  yellowResult =
    "Almeno il 50% degli argomenti appartengono all'elenco di voci del modello e l'elenco degli argomenti è presente nella pagina dei risultati di ricerca.";
  redResult =
    "Meno del 50% degli argomenti appartengono alle voci del modello o l'elenco degli argomenti non è presente nella pagina dei risultati di ricerca.";
  title =
    "R.SC.1.1 - VOCABOLARI CONTROLLATI - Il sito della scuola deve utilizzare argomenti forniti dal modello di sito scuola.";
  code = "R.SC.1.1";
  mainTitle = "VOCABOLARI CONTROLLATI";

  async meta() {
    return {
      id: this.auditId,
      title: this.title,
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  getFolderName(): string {
    return FOLDER_NAME;
  }

  async auditPage(page: Page, url: string) {
    const item = [
      {
        element_in_school_model_percentage: "",
        element_not_in_school_model: "",
      },
    ];

    const argumentsElements = await getArgumentsElements(url, page);

    if (argumentsElements.length <= 0) {
      this.globalResults.score = 0;
      this.globalResults.pagesItems.pages = [
        {
          result: notExecutedErrorMessage.replace("<LIST>", "all-topics"),
        },
      ];
      this.globalResults.pagesItems.headings = ["Risultato", "Errori"];

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
      score = 1;
    } else if (numberOfElementsNotInScuoleModelPercentage <= 50) {
      score = 0.5;
    }

    item[0].element_in_school_model_percentage =
      (100 - numberOfElementsNotInScuoleModelPercentage).toFixed(0).toString() +
      "%";
    item[0].element_not_in_school_model =
      schoolModelCheck.elementNotIncluded.join(", ");

    this.globalResults.score = score;
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
      message = this.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = "pass";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    return await ejs.renderFile(__dirname + `/${FOLDER_NAME}/template.ejs`, {
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

    await page.$eval('[data-element="search-modal-input"]', (el: Element) => {
      if (el instanceof HTMLInputElement) {
        el.value = "scuola";
      } else {
        console.warn("L'elemento selezionato non è un input.");
      }
    });

    const button: ElementHandle<Element> | null = await page.$(
      '[data-element="search-submit"]',
    );

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
