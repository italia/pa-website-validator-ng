"use strict";

import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";

import {
  checkOrder,
  getPageElementDataAttribute,
  getRedirectedUrl,
  missingMenuItems,
} from "../../utils/utils.js";
import { Page } from "puppeteer";
import { Audit, GlobalResults } from "../Audit.js";
import { detectLang, getFirstLevelPages } from "../../utils/school/utils.js";
import { MenuItem, primaryMenuItems } from "./menuItem.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_first_level_menu";

class SchoolFirstLevelMenuAudit extends Audit {
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
    recapItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  auditId = "school-menu-structure-match-model";
  code = "C.SC.1.4";
  mainTitle = "VOCI DI MENÙ DI PRIMO LIVELLO";
  greenResult =
    "Le voci del menù sono corrett, nell'ordine giusto e inviano a pagine interne al dominio della scuola.";
  yellowResult =
    "L'ordine delle voci del menu è corretto ma sono presenti fino a 3 voci aggiuntive. Tutte le voci inviano a pagine interne al dominio della scuola.";
  redResult =
    "Almeno una delle voci obbligatorie è assente o inesatta e/o le voci obbligatorie sono in ordine errato e/o sono presenti 8 o più voci nel menù del sito e/o sono presenti voci che inviano a pagine esterne al dominio della scuola.";
  nonExecuted =
    "Uno o più data-element necessari per condurre il test non sono stati trovati. Verifica il capitolo sui Requisiti tecnici nella Documentazione delle App di valutazione per risolvere il problema.";
  title =
    "C.SC.1.4 - VOCI DI MENÙ DI PRIMO LIVELLO - Il sito della scuola deve presentare tutte le voci di menù di primo livello, nell'esatto ordine descritto dalla documentazione del modello di sito scolastico.";

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
    let score = 0;

    const result = {
      found_menu_voices: "",
      missing_menu_voices: "",
      wrong_order_menu_voices: "",
    };

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    const menuDataElement = '[data-element="menu"]';
    const menuComponent = $(menuDataElement);
    if (menuComponent.length === 0) {
      this.globalResults.pagesItems.headings = ["Risultato"];
      this.globalResults.pagesItems.pages = [
        {
          result: this.nonExecuted,
        },
      ];

      return {
        score: 0,
        details: {
          items: [
            {
              result: this.nonExecuted,
            },
          ],
          type: "table",
          summary: "",
        },
      };
    }

    const foundMenuElements = await getPageElementDataAttribute(
      $,
      menuDataElement,
      "> li > a",
    );

    result.found_menu_voices = foundMenuElements.join(", ");

    const lang = detectLang(foundMenuElements);

    const mandatoryPrimaryMenuItems: MenuItem[] = primaryMenuItems[lang].map(
      (str) => ({
        name: str,
        regExp: new RegExp(`^${str}$`, "i"),
      }),
    );

    const missingMandatoryElements = missingMenuItems(
      foundMenuElements,
      mandatoryPrimaryMenuItems,
    );
    result.missing_menu_voices = missingMandatoryElements.join(", ");

    const orderResult = checkOrder(
      mandatoryPrimaryMenuItems,
      foundMenuElements,
    );
    result.wrong_order_menu_voices =
      orderResult.elementsNotInSequence.join(", ");

    const containsMandatoryElementsResult =
      missingMandatoryElements.length === 0;
    const mandatoryElementsCorrectOrder = correctOrderMandatoryElements(
      foundMenuElements,
      mandatoryPrimaryMenuItems,
    );

    if (
      foundMenuElements.length === 4 &&
      containsMandatoryElementsResult &&
      mandatoryElementsCorrectOrder
    ) {
      score = 1;
    } else if (
      foundMenuElements.length > 4 &&
      foundMenuElements.length < 8 &&
      containsMandatoryElementsResult &&
      mandatoryElementsCorrectOrder
    ) {
      score = 0.5;
    }

    if (this.globalResults.recapItems) {
      this.globalResults.recapItems.headings = [
        "Voci del menù identificate",
        "Voci obbligatorie del menù mancanti",
        "Voci del menù in ordine errato",
      ];
      this.globalResults.recapItems.pages = [result];
    }

    const firstLevelPages = await getFirstLevelPages(url);

    this.globalResults.pagesItems.headings = [
      "Voce di menù",
      "Link trovato",
      "Pagina interna al dominio",
    ];

    const host = new URL(url).hostname.replace("www.", "");
    for (const page of firstLevelPages) {
      const redirectedUrl = await getRedirectedUrl(page.linkUrl);
      const pageHost = new URL(redirectedUrl).hostname.replace("www.", "");
      const isInternal = pageHost.includes(host);

      if (!isInternal) {
        score = 0;
      }

      const item = {
        menu_voice: page.linkName,
        link: page.linkUrl,
        external: isInternal ? "Sì" : "No",
      };

      this.globalResults.pagesItems.pages.push(item);
    }

    this.globalResults.score = score;
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

  static getInstance(): SchoolFirstLevelMenuAudit {
    if (!SchoolFirstLevelMenuAudit.instance) {
      SchoolFirstLevelMenuAudit.instance = new SchoolFirstLevelMenuAudit();
    }
    return <SchoolFirstLevelMenuAudit>SchoolFirstLevelMenuAudit.instance;
  }
}

export { SchoolFirstLevelMenuAudit };
export default SchoolFirstLevelMenuAudit.getInstance;

function correctOrderMandatoryElements(
  menuElements: string[],
  mandatoryElements: MenuItem[],
): boolean {
  let result = true;

  for (let i = 0; i < mandatoryElements.length; i++) {
    if (!mandatoryElements[i].regExp.test(menuElements[i])) {
      result = false;
    }
  }

  return result;
}
