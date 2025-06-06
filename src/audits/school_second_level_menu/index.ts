"use strict";

import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";

import {
  getPageElementDataAttribute,
  getRedirectedUrl,
} from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import { detectLang, getSecondLevelPages } from "../../utils/school/utils.js";
import {
  customPrimaryMenuItemsDataElement,
  menuItems,
  primaryMenuDataElement,
} from "./menuItem.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_second_level_menu";

interface itemPage {
  key: string;
  pagesInVocabulary: string[];
  pagesNotInVocabulary: string[];
}

class SchoolSecondLevelMenuAudit extends Audit {
  public globalResults: GlobalResults = {
    score: 0,
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    recapItems: {
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
  };

  auditId = "school-menu-scuola-second-level-structure-match-model";
  greenResult =
    "Tutte le voci usate sono corrette e inviano a pagine interne al dominio della scuola.";
  yellowResult =
    "Almeno il 30% delle voci usate sono corrette e tutte le voci inviano a pagine interne al dominio della scuola.";
  redResult =
    "Meno del 30% delle voci sono corrette o sono presenti voci che inviano a pagine esterne al dominio della scuola.";
  nonExecuted =
    "Uno o più data-element necessari per condurre il test non sono stati trovati. Verifica il capitolo sui Requisiti tecnici nella Documentazione delle App di valutazione per risolvere il problema.";
  title =
    "C.SC.1.5 - VOCI DI MENÙ DI SECONDO LIVELLO - Il sito presenta le voci di menù di secondo livello come descritto nella documentazione del modello di sito della scuola.";
  code = "C.SC.1.5";
  mainTitle = "VOCI DI MENÙ DI SECONDO LIVELLO";

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
    const result = {
      correct_voices_percentage: "",
      correct_voices: "",
      wrong_voices: "",
    };

    let totalNumberOfTitleFound = 0;
    const itemsPage: itemPage[] = [];

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    const foundMenuElements = await getPageElementDataAttribute(
      $,
      '[data-element="menu"]',
      "> li > a",
    );

    const lang = detectLang(foundMenuElements);

    const overviewText = (
      await getPageElementDataAttribute(
        $,
        `[data-element="${primaryMenuDataElement}"]`,
      )
    )[0];

    for (const [, secondaryMenuItem] of Object.entries(menuItems)) {
      const item: itemPage = {
        key: secondaryMenuItem.label[lang],
        pagesInVocabulary: [],
        pagesNotInVocabulary: [],
      };

      const menuDataElement = `[data-element="${secondaryMenuItem.data_element}"]`;

      const headerUlTest = await getPageElementDataAttribute(
        $,
        menuDataElement,
        "a",
      );

      if (headerUlTest.length === 0) {
        return {
          score: 0,
          details: {
            items: [
              {
                result: this.nonExecuted,
              },
            ],
            type: "table",
            headings: [{ key: "result", itemType: "text", text: "Risultato" }],
            summary: "",
          },
        };
      }

      for (const element of headerUlTest) {
        if (element !== overviewText) {
          const allowed = secondaryMenuItem.dictionary[lang].map((s) =>
            s.toLowerCase(),
          );
          if (allowed.includes(element.toLowerCase())) {
            item.pagesInVocabulary.push(element);
          } else {
            item.pagesNotInVocabulary.push(element);
          }
          totalNumberOfTitleFound++;
        }
      }

      itemsPage.push(item);
    }

    const errorVoices = [];

    const headerUlTest = await getPageElementDataAttribute(
      $,
      `[data-element="${customPrimaryMenuItemsDataElement}"]`,
      "a",
    );

    if (headerUlTest.length > 0) {
      for (const element of headerUlTest) {
        if (element !== overviewText) {
          errorVoices.push(element.toLowerCase());
        }
      }
    }

    let pagesInVocabulary = 0;
    let correctTitleFound = "";
    let wrongTitleFound = "";

    for (const itemPage of itemsPage) {
      pagesInVocabulary += itemPage.pagesInVocabulary.length;

      if (itemPage.pagesInVocabulary.length > 0) {
        correctTitleFound += itemPage.key + ": ";
        correctTitleFound += itemPage.pagesInVocabulary.join(", ");
        correctTitleFound += "; ";
      }

      if (itemPage.pagesNotInVocabulary.length > 0) {
        wrongTitleFound += itemPage.key + ": ";
        wrongTitleFound += itemPage.pagesNotInVocabulary.join(", ");
        wrongTitleFound += "; ";
      }
    }

    if (errorVoices.length > 0) {
      wrongTitleFound += "ALTRE VOCI: ";
      wrongTitleFound += errorVoices.join(", ");
      wrongTitleFound += "; ";
    }

    const presentVoicesPercentage: number = parseInt(
      (
        (pagesInVocabulary / (totalNumberOfTitleFound + errorVoices.length)) *
        100
      ).toFixed(0),
    );

    let score = 0;
    if (presentVoicesPercentage >= 30 && presentVoicesPercentage < 100) {
      score = 0.5;
    } else if (presentVoicesPercentage === 100) {
      score = 1;
    }

    result.correct_voices = correctTitleFound;
    result.correct_voices_percentage = presentVoicesPercentage.toString() + "%";
    result.wrong_voices = wrongTitleFound;

    if (this.globalResults.recapItems) {
      this.globalResults.recapItems.headings = [
        "% di voci corrette tra quelle usate",
        "Voci corrette identificate",
        "Voci aggiuntive trovate",
      ];
      this.globalResults.recapItems.pages = [result];
    }

    const secondLevelPages = await getSecondLevelPages(url);

    this.globalResults.pagesItems.headings = [
      "Voce di menù",
      "Link trovato",
      "Pagina interna al dominio",
    ];

    const host = new URL(url).hostname.replace("www.", "");
    for (const page of secondLevelPages) {
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

  static getInstance(): SchoolSecondLevelMenuAudit {
    if (!SchoolSecondLevelMenuAudit.instance) {
      SchoolSecondLevelMenuAudit.instance = new SchoolSecondLevelMenuAudit();
    }
    return <SchoolSecondLevelMenuAudit>SchoolSecondLevelMenuAudit.instance;
  }
}

export { SchoolSecondLevelMenuAudit };
export default SchoolSecondLevelMenuAudit.getInstance;
