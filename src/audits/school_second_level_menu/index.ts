"use strict";

import { CheerioAPI } from "cheerio";

import {
  getPageElementDataAttribute,
  getRedirectedUrl,
} from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit } from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";
import { detectLang, getSecondLevelPages } from "../../utils/school/utils.js";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  customPrimaryMenuItemsDataElement,
  menuItems,
  primaryMenuDataElement,
} from "./menuItem.js";
import * as ejs from "ejs";

interface itemPage {
  key: string;
  pagesInVocabulary: string[];
  pagesNotInVocabulary: string[];
}

class SchoolSecondLevelMenuAudit extends Audit {
  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: "table",
      headings: [],
      summary: "",
    },
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
    errorMessage: "",
  };

  private headings: any = [];
  auditId = "school-menu-scuola-second-level-structure-match-model";
  auditData =
    auditDictionary["school-menu-scuola-second-level-structure-match-model"];
  code = "C.SC.1.5";
  mainTitle = "VOCI DI MENÙ DI SECONDO LIVELLO";

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
      this.globalResults.details.items.push([
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ]);
      this.globalResults.details.headings = [
        { key: "result", itemType: "text", text: "Risultato" },
      ];

      this.globalResults.pagesItems.headings = ["Risultato"];
      this.globalResults.pagesItems.message = notExecutedErrorMessage.replace(
        "<LIST>",
        error,
      );
      this.globalResults.pagesItems.items = [
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
          key: "correct_voices_percentage",
          itemType: "text",
          text: "% di voci corrette tra quelle usate",
          subItemsHeading: {
            key: "inspected_page",
            itemType: "url",
          },
        },
        {
          key: "correct_voices",
          itemType: "text",
          text: "Voci corrette identificate",
          subItemsHeading: {
            key: "external",
            itemType: "text",
          },
        },
        {
          key: "wrong_voices",
          itemType: "text",
          text: "Voci aggiuntive trovate",
        },
      ];

      const results = [];
      results.push({
        result: this.auditData.redResult,
        correct_voices_percentage: "",
        correct_voices: "",
        wrong_voices: "",
      });

      let totalNumberOfTitleFound = 0;
      const itemsPage: itemPage[] = [];

      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const foundMenuElements = await getPageElementDataAttribute(
        $,
        '[data-element="menu"]',
        "> li > a",
      );

      const lang = detectLang(foundMenuElements);

      // "Panoramica"
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
                  result: this.auditData.nonExecuted,
                },
              ],
              type: "table",
              headings: [
                { key: "result", itemType: "text", text: "Risultato" },
              ],
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
        results[0].result = this.auditData.yellowResult;
      } else if (presentVoicesPercentage === 100) {
        score = 1;
        results[0].result = this.auditData.greenResult;
      }

      results[0].correct_voices = correctTitleFound;
      results[0].correct_voices_percentage =
        presentVoicesPercentage.toString() + "%";
      results[0].wrong_voices = wrongTitleFound;

      this.globalResults.recapItems.headings = [
        "Risultato",
        "% di voci corrette tra quelle usate",
        "Voci corrette identificate",
        "Voci aggiuntive trovate",
      ];
      this.globalResults.recapItems.pages = [results[0]];

      const secondLevelPages = await getSecondLevelPages(url); //TODO: questo metodo utilizza una nuova istanza di puppeteer

      results.push({});

      results.push({
        result: "Voce di menù",
        correct_voices: "Pagina interna al dominio",
        correct_voices_percentage: "Link trovato",
      });

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

        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });

        this.globalResults.pagesItems.pages.push(item);
      }

      this.globalResults.score = score;
      this.globalResults.details.items = results;
      this.globalResults.details.headings = this.headings;
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

    const reportHtml = await ejs.renderFile(
      "src/audits/school_second_level_menu/template.ejs",
      {
        ...(await this.meta()),
        code: this.code,
        table: this.globalResults,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
    return reportHtml;
  }

  static getInstance(): Promise<SchoolSecondLevelMenuAudit> {
    if (!SchoolSecondLevelMenuAudit.instance) {
      SchoolSecondLevelMenuAudit.instance = new SchoolSecondLevelMenuAudit(
        "",
        [],
        [],
      );
    }
    return SchoolSecondLevelMenuAudit.instance;
  }
}

export { SchoolSecondLevelMenuAudit };
export default SchoolSecondLevelMenuAudit.getInstance;
