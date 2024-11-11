"use strict";

import {
  buildUrl,
  getHREFValuesDataAttribute,
  getPageElementDataAttribute,
  isInternalUrl,
  loadPageData,
} from "../../utils/utils.js";
import { getSecondLevelPages } from "../../utils/municipality/utils.js";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import {
  customPrimaryMenuItemsDataElement,
  customSecondaryMenuItemsDataElement,
  primaryMenuItems,
} from "./menuItems.js";
import { DataElementError } from "../../utils/DataElementError.js";
import { Audit, GlobalResults } from "../Audit.js";
import { Page } from "puppeteer";
import { errorHandling } from "../../config/commonAuditsParts.js";
import * as ejs from "ejs";
import { MunicipalitySecondLevelPages } from "../../types/crawler-types.js";
import { __dirname } from "../esmHelpers.js";

const auditId = "municipality-second-level-pages";
const greenResult = "Tutti i titoli usati sono corretti.";
const yellowResult = "Almeno il 50% dei titoli usati è corretto.";
const redResult = "Meno del 50% dei titoli usati è corretto.";
const title =
  "C.SI.1.7 - TITOLI DELLE PAGINE DI SECONDO LIVELLO - Nel sito comunale, i titoli delle pagine di secondo livello devono rispettare il vocabolario descritto dalla documentazione del modello di sito comunale.";
const code = "C.SI.1.7";
const mainTitle = "TITOLI DELLE PAGINE DI SECONDO LIVELLO ";
interface itemPage {
  key: string;
  pagesInVocabulary: string[];
  pagesNotInVocabulary: string[];
}

const FOLDER_NAME = "municipality_second_level_pages_audit";

class SecondLevelAudit extends Audit {
  public globalResults: GlobalResults = {
    score: 0,
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  public score = 0;
  private secondLevelPages: MunicipalitySecondLevelPages = {
    management: [],
    news: [],
    services: [],
    live: [],
    custom: [],
  };
  private pagesItems: itemPage[] = [];
  private errorVoices: string[] = [];
  private totalNumberOfTitleFound = 0;

  async meta() {
    return {
      id: auditId,
      title: title,
      code: code,
      mainTitle: mainTitle,
      auditId: auditId,
    };
  }

  getFolderName(): string {
    return FOLDER_NAME;
  }

  async auditPage(page: Page, url: string) {
    try {
      this.secondLevelPages = await getSecondLevelPages(url, true);
    } catch (ex) {
      if (!(ex instanceof DataElementError)) {
        throw ex;
      }

      let errorMessage = ex.message;
      errorMessage = errorMessage.substring(
        errorMessage.indexOf('"') + 1,
        errorMessage.lastIndexOf('"'),
      );

      this.globalResults.pagesInError.pages.push({
        link: url,
        errors_found: errorMessage,
      });

      this.score = 0;

      return {
        score: 0,
      };
    }

    for (const [key, primaryMenuItem] of Object.entries(primaryMenuItems)) {
      const item: itemPage = {
        key: primaryMenuItem.label,
        pagesInVocabulary: [],
        pagesNotInVocabulary: [],
      };

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondLevelPagesSection = this.secondLevelPages[key];
      for (const page of secondLevelPagesSection) {
        if (primaryMenuItem.dictionary.includes(page.linkName.toLowerCase())) {
          item.pagesInVocabulary.push(page.linkName);
        } else {
          item.pagesNotInVocabulary.push(page.linkName);
        }
      }

      this.totalNumberOfTitleFound += secondLevelPagesSection.length;

      this.pagesItems.push(item);
    }

    const data = await page.content();
    let $: CheerioAPI = await cheerio.load(data);

    const customPrimaryMenuDataElement = `[data-element="${customPrimaryMenuItemsDataElement}"]`;
    const customSecondLevelPageHref = await getHREFValuesDataAttribute(
      $,
      customPrimaryMenuDataElement,
    );

    for (let customSecondLevelPageUrl of customSecondLevelPageHref) {
      if (
        (await isInternalUrl(customSecondLevelPageUrl)) &&
        !customSecondLevelPageUrl.includes(url)
      ) {
        customSecondLevelPageUrl = await buildUrl(
          url,
          customSecondLevelPageUrl,
        );
      }

      $ = await loadPageData(customSecondLevelPageUrl);

      const customSecondaryMenuDataElement = `[data-element="${customSecondaryMenuItemsDataElement}"]`;
      const customSecondLevelPagesNames = await getPageElementDataAttribute(
        $,
        customSecondaryMenuDataElement,
      );

      this.errorVoices = [...this.errorVoices, ...customSecondLevelPagesNames];
    }

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    const results = [];
    this.globalResults.pagesItems.pages = [];

    if (this.globalResults.pagesInError.pages.length) {
      this.globalResults.error = true;

      this.globalResults.pagesItems.message = errorHandling.errorMessage;
      this.globalResults.pagesItems.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];
      this.globalResults.pagesInError.pages.forEach(
        (p: Record<string, unknown>) => {
          this.globalResults.pagesItems.pages.push(p);
        },
      );
    }
    results.push({
      correct_title_percentage: "",
      correct_title_found: "",
      wrong_title_found: "",
    });

    let pagesInVocabulary = 0;
    let correctTitleFound = "";
    let wrongTitleFound = "";

    for (const itemPage of this.pagesItems) {
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

    if (this.errorVoices.length > 0) {
      wrongTitleFound += "ALTRI TITOLI: ";
      wrongTitleFound += this.errorVoices.join(", ");
      wrongTitleFound += "; ";
    }

    const pagesFoundInVocabularyPercentage = parseInt(
      (
        (pagesInVocabulary /
          (this.totalNumberOfTitleFound + this.errorVoices.length)) *
        100
      ).toFixed(0),
    );

    if (pagesFoundInVocabularyPercentage === 100) {
      this.score = 1;
    } else if (
      pagesFoundInVocabularyPercentage > 50 &&
      pagesFoundInVocabularyPercentage < 100
    ) {
      this.score = 0.5;
    }

    results[0].correct_title_percentage = pagesFoundInVocabularyPercentage
      ? pagesFoundInVocabularyPercentage + "%"
      : "0%";
    results[0].correct_title_found = correctTitleFound;
    results[0].wrong_title_found = wrongTitleFound;

    this.globalResults.score = this.score;

    this.globalResults.pagesItems.headings = [
      "% di titoli corretti tra quelli usati",
      "Titoli corretti identificati",
      "Titoli aggiuntivi trovat",
    ];
    this.globalResults.pagesItems.pages = [results[0]];

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = greenResult;
    } else if (this.score == 0.5) {
      status = "pass";
      message = yellowResult;
    } else {
      status = "fail";
      message = redResult;
    }

    return await ejs.renderFile(__dirname + `/${FOLDER_NAME}/template.ejs`, {
      ...(await this.meta()),
      code: code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  async getType() {
    return auditId;
  }

  static getInstance(): SecondLevelAudit {
    if (!SecondLevelAudit.instance) {
      SecondLevelAudit.instance = new SecondLevelAudit();
    }
    return <SecondLevelAudit>SecondLevelAudit.instance;
  }
}

export { SecondLevelAudit };
export default SecondLevelAudit.getInstance;
