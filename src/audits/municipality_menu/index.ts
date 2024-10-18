"use strict";

import { primaryMenuItems } from "./menuItems.js";
import {
  checkOrder,
  getRedirectedUrl,
  missingMenuItems,
} from "../../utils/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { MenuItem } from "../../types/menuItem.js";
import { getFirstLevelPages } from "../../utils/municipality/utils.js";
import {Audit, GlobalResults} from "../Audit.js";
import { Page } from "puppeteer";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const auditId = "municipality-menu-structure-match-model";
const auditData = auditDictionary[auditId];

const greenResult = auditData.greenResult;
const yellowResult = auditData.yellowResult;
const redResult = auditData.redResult;

class MenuAudit extends Audit {
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

  code = "C.SI.1.6";
  mainTitle = "VOCI DI MENÙ DI PRIMO LIVELLO";

  public score = 0;
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

  async auditPage(page: Page | null, error?: string) {
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

      this.globalResults.error = true;

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      const results = [];
      results.push({
        result: redResult,
        found_menu_voices: "",
        missing_menu_voices: "",
        wrong_order_menu_voices: "",
      });

      const firstLevelPages = await getFirstLevelPages(url, false, page);

      const foundMenuElements = firstLevelPages.map((page) => {
        return page.linkName;
      });

      results[0].found_menu_voices = foundMenuElements.join(", ");

      const menuItem: MenuItem[] = [];

      for (const [, primaryMenuItem] of Object.entries(primaryMenuItems)) {
        menuItem.push({
          name: primaryMenuItem.name,
          regExp: primaryMenuItem.regExp,
        });
      }

      const missingMandatoryElements = missingMenuItems(
        foundMenuElements,
        menuItem,
      );
      results[0].missing_menu_voices = missingMandatoryElements.join(", ");

      const orderResult = checkOrder(menuItem, foundMenuElements);
      results[0].wrong_order_menu_voices =
        orderResult.elementsNotInSequence.join(", ");

      const containsMandatoryElementsResult =
        missingMandatoryElements.length === 0;

      if (
        foundMenuElements.length === 4 &&
        containsMandatoryElementsResult &&
        orderResult.numberOfElementsNotInSequence === 0
      ) {
        this.score = 1;
        results[0].result = greenResult;
      } else if (
        foundMenuElements.length > 4 &&
        foundMenuElements.length < 8 &&
        containsMandatoryElementsResult &&
        orderResult.numberOfElementsNotInSequence === 0
      ) {
        this.score = 0.5;
        results[0].result = yellowResult;
      }

      if(this.globalResults.recapItems){
        this.globalResults.recapItems.headings = [
          "Risultato",
          "Voci del menù identificate",
          "Voci del menù mancanti",
          "Voci del menù in ordine errato",
        ];

        this.globalResults.recapItems.pages = [results[0]];
      }

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
          this.score = 0;
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

      this.globalResults.score = this.score;
      this.globalResults.details.items = results;
    }

    return {
      score: this.score,
    };
  }

  async getType() {
    return auditId;
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

  static getInstance(): MenuAudit {
    if (!MenuAudit.instance) {
      MenuAudit.instance = new MenuAudit();
    }
    return <MenuAudit>MenuAudit.instance;
  }
}

export { MenuAudit };
export default MenuAudit.getInstance;
