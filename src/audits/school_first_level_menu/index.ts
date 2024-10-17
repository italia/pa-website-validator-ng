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

import {Audit, GlobalResults} from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import { detectLang, getFirstLevelPages } from "../../utils/school/utils.js";
import { MenuItem, primaryMenuItems } from "./menuItem.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolFirstLevelMenuAudit extends Audit {
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
    recapItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  auditId = "school-menu-structure-match-model";
  auditData = auditDictionary["school-menu-structure-match-model"];
  code = "C.SC.1.4";
  mainTitle = "VOCI DI MENÙ DI PRIMO LIVELLO";

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

      let score = 0;

      const results = [];
      results.push({
        result: this.auditData.redResult,
        found_menu_voices: "",
        missing_menu_voices: "",
        wrong_order_menu_voices: "",
      });

      const data = await page.content();
      const $: CheerioAPI = await cheerio.load(data);

      const menuDataElement = '[data-element="menu"]';
      const menuComponent = $(menuDataElement);
      if (menuComponent.length === 0) {
        this.globalResults.pagesItems.headings = ["Risultato"];
        this.globalResults.pagesItems.pages = [
          {
            result: this.auditData.nonExecuted,
          },
        ];

        return {
          score: 0,
          details: {
            items: [
              {
                result: this.auditData.nonExecuted,
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

      results[0].found_menu_voices = foundMenuElements.join(", ");

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
      results[0].missing_menu_voices = missingMandatoryElements.join(", ");

      const orderResult = checkOrder(
        mandatoryPrimaryMenuItems,
        foundMenuElements,
      );
      results[0].wrong_order_menu_voices =
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
        results[0].result = this.auditData.greenResult;
      } else if (
        foundMenuElements.length > 4 &&
        foundMenuElements.length < 8 &&
        containsMandatoryElementsResult &&
        mandatoryElementsCorrectOrder
      ) {
        score = 0.5;
        results[0].result = this.auditData.yellowResult;
      }

      if(this.globalResults.recapItems){
        this.globalResults.recapItems.headings = [
          "Risultato",
          "Voci del menù identificate",
          "Voci obbligatorie del menù mancanti",
          "Voci del menù in ordine errato",
        ];
        this.globalResults.recapItems.pages = [results[0]];
      }


      const firstLevelPages = await getFirstLevelPages(url);

      results.push({});

      results.push({
        result: "Voce di menù",
        found_menu_voices: "Link trovato",
        missing_menu_voices: "Pagina interna al dominio",
      });

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

  static getInstance(): Promise<SchoolFirstLevelMenuAudit> {
    if (!SchoolFirstLevelMenuAudit.instance) {
      SchoolFirstLevelMenuAudit.instance = new SchoolFirstLevelMenuAudit(
        "",
        [],
        [],
      );
    }
    return SchoolFirstLevelMenuAudit.instance;
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
