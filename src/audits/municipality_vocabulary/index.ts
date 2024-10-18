"use strict";

import {
  eurovocVocabulary,
  municipalityModelVocabulary,
} from "./controlledVocabulary.js";
import {
  areAllElementsInVocabulary,
  buildUrl,
  getHREFValuesDataAttribute,
  getPageElementDataAttribute,
  isInternalUrl,
  loadPageData,
} from "../../utils/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import {Audit, GlobalResults} from "../Audit.js";

import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const auditId = "municipality-controlled-vocabularies";
const auditData = auditDictionary[auditId];

const greenResult = auditData.greenResult;
const yellowResult = auditData.yellowResult;
const redResult = auditData.redResult;

class MunicipalityVocabulary extends Audit {
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

  code = "C.SI.1.5";
  mainTitle = "VOCABOLARI CONTROLLATI";

  score = 0;

  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: auditId,
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
        }
      ];

      this.globalResults.error = true;

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      this.globalResults.pagesItems.headings = [
        "Risultato",
        "% di argomenti presenti nell'elenco del modello",
        "Argomenti non presenti nell'elenco del modello",
        "% di argomenti presenti nell'elenco del modello o EuroVoc",
        "Argomenti non presenti nell'elenco del modello o EuroVoc",
      ];

      const item = [
        {
          result: redResult,
          element_in_municipality_model_percentage: "",
          element_not_in_municipality_vocabulary: "",
          element_in_union_percentage: "",
          element_not_in_union_vocabulary: "",
        },
      ];

      const data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const allArgumentsHREF = await getHREFValuesDataAttribute(
        $,
        '[data-element="all-topics"]',
      );

      if (allArgumentsHREF.length <= 0) {
        item[0].result = notExecutedErrorMessage.replace(
          "<LIST>",
          "`all-topics",
        );

        this.globalResults.details.items = item;
        this.globalResults.pagesItems.pages = item;
        this.globalResults.score = 0;
        this.score = 0;

        return {
          score: 0,
        };
      }

      let allArgumentsPageUrl = allArgumentsHREF[0];
      if (
        (await isInternalUrl(allArgumentsPageUrl)) &&
        !allArgumentsPageUrl.includes(url)
      ) {
        allArgumentsPageUrl = await buildUrl(url, allArgumentsHREF[0]);
      }

      $ = await loadPageData(allArgumentsPageUrl);
      const argumentList = await getPageElementDataAttribute(
        $,
        '[data-element="topic-element"]',
      );

      if (argumentList.length === 0) {
        this.globalResults.details.items = item;
        this.globalResults.pagesItems.pages = item;
        this.globalResults.score = 0;
        this.score = 0;

        return {
          score: 0,
        };
      }

      const elementInfoMunicipalityVocabulary =
        await areAllElementsInVocabulary(
          argumentList,
          municipalityModelVocabulary,
        );

      const elementInMunicipalityModelPercentage = parseInt(
        (
          (elementInfoMunicipalityVocabulary.elementIncluded.length /
            argumentList.length) *
          100
        ).toFixed(0),
      );

      const lowerCaseEurovoc = eurovocVocabulary.map((element) => {
        return element.toLowerCase();
      });
      const lowerCaseModel = municipalityModelVocabulary.map((element) => {
        return element.toLowerCase();
      });
      const uniq = [...new Set([...lowerCaseEurovoc, ...lowerCaseModel])];

      const elementInUnionVocabulary = await areAllElementsInVocabulary(
        argumentList,
        uniq,
      );

      const elementInUnionVocabularyPercentage = parseInt(
        (
          (elementInUnionVocabulary.elementIncluded.length /
            argumentList.length) *
          100
        ).toFixed(0),
      );

      if (elementInfoMunicipalityVocabulary.allArgumentsInVocabulary) {
        this.score = 1;
        item[0].result = greenResult;
      } else if (elementInUnionVocabularyPercentage >= 50) {
        item[0].result = yellowResult;
        this.score = 0.5;
      } else {
        item[0].result = redResult;
        this.score = 0;
      }

      item[0].element_in_municipality_model_percentage =
        elementInMunicipalityModelPercentage + "%";
      item[0].element_in_union_percentage =
        elementInUnionVocabularyPercentage + "%";
      item[0].element_not_in_municipality_vocabulary =
        elementInfoMunicipalityVocabulary.elementNotIncluded.join(", ");
      item[0].element_not_in_union_vocabulary =
        elementInUnionVocabulary.elementNotIncluded.join(", ");

      this.globalResults.details.items = item;
      this.globalResults.pagesItems.pages = item;
      this.globalResults.score = this.score;

      return {
        score: this.score,
      };
    }
  }

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.score == 0.5) {
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

  static getInstance(): MunicipalityVocabulary {
    if (!MunicipalityVocabulary.instance) {
      MunicipalityVocabulary.instance = new MunicipalityVocabulary();
    }
    return <MunicipalityVocabulary>MunicipalityVocabulary.instance;
  }
}

export { MunicipalityVocabulary };
export default MunicipalityVocabulary.getInstance;
