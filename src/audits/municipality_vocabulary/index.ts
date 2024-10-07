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
import {Audit} from "../Audit.js";

import {CheerioAPI} from "cheerio";
import * as cheerio from "cheerio";
import {Page} from "puppeteer";

const auditId = "municipality-controlled-vocabularies";
const auditData = auditDictionary[auditId];

const greenResult = auditData.greenResult;
const yellowResult = auditData.yellowResult;
const redResult = auditData.redResult;

class MunicipalityVocabulary extends Audit {
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

  score = 0;

  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null,
    error?:string
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

      const headings = [
        { key: "result", itemType: "text", text: "Risultato" },
        {
          key: "element_in_municipality_model_percentage",
          itemType: "text",
          text: "% di argomenti presenti nell'elenco del modello",
        },
        {
          key: "element_not_in_municipality_vocabulary",
          itemType: "text",
          text: "Argomenti non presenti nell'elenco del modello",
        },
        {
          key: "element_in_union_percentage",
          itemType: "text",
          text: "% di argomenti presenti nell'elenco del modello o EuroVoc",
        },
        {
          key: "element_not_in_union_vocabulary",
          itemType: "text",
          text: "Argomenti non presenti nell'elenco del modello o EuroVoc",
        },
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

      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const allArgumentsHREF = await getHREFValuesDataAttribute(
          $,
          '[data-element="all-topics"]'
      );

      if (allArgumentsHREF.length <= 0) {
        item[0].result = notExecutedErrorMessage.replace("<LIST>", "`all-topics");
        this.globalResults.details.headings = headings;
        this.globalResults.details.items = item;
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
          '[data-element="topic-element"]'
      );

      if (argumentList.length === 0) {

        this.globalResults.details.headings = headings;
        this.globalResults.details.items = item;
        this.globalResults.score = 0;
        this.score = 0;

        return {
          score: 0,
        };
      }

      const elementInfoMunicipalityVocabulary = await areAllElementsInVocabulary(
          argumentList,
          municipalityModelVocabulary
      );

      const elementInMunicipalityModelPercentage = parseInt(
          (
              (elementInfoMunicipalityVocabulary.elementIncluded.length /
                  argumentList.length) *
              100
          ).toFixed(0)
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
          uniq
      );

      const elementInUnionVocabularyPercentage = parseInt(
          (
              (elementInUnionVocabulary.elementIncluded.length /
                  argumentList.length) *
              100
          ).toFixed(0)
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

      this.globalResults.details.headings = headings;
      this.globalResults.details.items = item;
      this.globalResults.score = this.score;

      return {
        score: this.score,
      };

    }

  }
  async getType(){
    return this.auditId;
  }

  async returnGlobal(){
    return this.globalResults;
  }

  static getInstance(): Promise<MunicipalityVocabulary> {
    if (!MunicipalityVocabulary.instance) {
      MunicipalityVocabulary.instance = new MunicipalityVocabulary('',[],[]);
    }
    return MunicipalityVocabulary.instance;
  }

}

export {MunicipalityVocabulary};
export default MunicipalityVocabulary.getInstance;
