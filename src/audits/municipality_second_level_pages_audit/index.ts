"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
  buildUrl,
  getHREFValuesDataAttribute,
  getPageElementDataAttribute,
  isInternalUrl,
  loadPageData,
} from "../../utils/utils.js";
import { getSecondLevelPages } from "../../utils/municipality/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { CheerioAPI } from "cheerio";
import {
  customPrimaryMenuItemsDataElement,
  customSecondaryMenuItemsDataElement,
  primaryMenuItems,
} from "../../storage/municipality/menuItems.js";
import { DataElementError } from "../../utils/DataElementError.js";
import { notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";

const auditId = "municipality-second-level-pages";
const auditData = auditDictionary[auditId];

interface itemPage {
  key: string;
  pagesInVocabulary: string[];
  pagesNotInVocabulary: string[];
}

class SecondLevelAudit extends Audit {
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
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError : any = [];
  public score = 0;
  private headings : any = [];
  private secondLevelPages : any = [];
  private itemsPage: itemPage[] = [];
  private errorVoices: string[] = [];
  private totalNumberOfTitleFound = 0;

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
   page: Page | null,
   error: string,
  ) {

    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato",
        subItemsHeading: {
          key: "menu_voice",
          itemType: "text",
        },
      },
      {
        key: "correct_title_percentage",
        itemType: "text",
        text: "% di titoli corretti tra quelli usati",
        subItemsHeading: {
          key: "inspected_page",
          itemType: "url",
        },
      },
      {
        key: "correct_title_found",
        itemType: "text",
        text: "Titoli corretti identificati",
        subItemsHeading: {
          key: "external",
          itemType: "text",
        },
      },
      {
        key: "wrong_title_found",
        itemType: "text",
        text: "Titoli aggiuntivi trovati",
      },
    ];

    if (error && !page) {

      this.score = 0;

      this.pagesInError.push({
        inspected_page: '',
        wrong_order_elements: "",
        missing_elements: error,
      });

      return {
        score: 0,
      }
    }

    if(page){
      const url = page.url();

      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.secondLevelPages = await getSecondLevelPages(url, true);
      } catch (ex) {
        if (!(ex instanceof DataElementError)) {
          throw ex;
        }

        let errorMessage = ex.message;
        errorMessage = errorMessage.substring(
            errorMessage.indexOf('"') + 1,
            errorMessage.lastIndexOf('"')
        );

        this.pagesInError.push({
          inspected_page: url,
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

        this.itemsPage.push(item);
      }

      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const customPrimaryMenuDataElement = `[data-element="${customPrimaryMenuItemsDataElement}"]`;
      const customSecondLevelPageHref = await getHREFValuesDataAttribute(
          $,
          customPrimaryMenuDataElement
      );

      for (let customSecondLevelPageUrl of customSecondLevelPageHref) {
        if (
            (await isInternalUrl(customSecondLevelPageUrl)) &&
            !customSecondLevelPageUrl.includes(url)
        ) {
          customSecondLevelPageUrl = await buildUrl(
              url,
              customSecondLevelPageUrl
          );
        }

        $ = await loadPageData(customSecondLevelPageUrl);

        const customSecondaryMenuDataElement = `[data-element="${customSecondaryMenuItemsDataElement}"]`;
        const customSecondLevelPagesNames = await getPageElementDataAttribute(
            $,
            customSecondaryMenuDataElement
        );

        this.errorVoices = [...this.errorVoices, ...customSecondLevelPagesNames];
      }
    }

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    const results = [];
    results.push({
      result: auditData.redResult,
      correct_title_percentage: "",
      correct_title_found: "",
      wrong_title_found: "",
    });


    let pagesInVocabulary = 0;
    let correctTitleFound = "";
    let wrongTitleFound = "";

    for (const itemPage of this.itemsPage) {
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
            (pagesInVocabulary / (this.totalNumberOfTitleFound + this.errorVoices.length)) *
            100
        ).toFixed(0)
    );

    if (pagesFoundInVocabularyPercentage === 100) {
      results[0].result = auditData.greenResult;
      this.score = 1;
    } else if (
        pagesFoundInVocabularyPercentage > 50 &&
        pagesFoundInVocabularyPercentage < 100
    ) {
      results[0].result = auditData.yellowResult;
      this.score = 0.5;
    }

    results[0].correct_title_percentage =
        pagesFoundInVocabularyPercentage + "%";
    results[0].correct_title_found = correctTitleFound;
    results[0].wrong_title_found = wrongTitleFound;


    this.globalResults.details.headings = this.headings;
    this.globalResults.details.items = results;
    this.globalResults.score = this.score;

    return this.globalResults
  }

  async getType(){
    return auditId;
  }

  static getInstance(): Promise<SecondLevelAudit> {
    if (!SecondLevelAudit.instance) {
      SecondLevelAudit.instance = new SecondLevelAudit('',[],[]);
    }
    return SecondLevelAudit.instance;
  }

}

export { SecondLevelAudit };
export default SecondLevelAudit.getInstance;
