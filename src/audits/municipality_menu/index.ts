"use strict";

import { primaryMenuItems } from "./menuItems.js";
import {
  checkOrderLoose,
  getRedirectedUrl,
  missingMenuItems,
  redirectUrlIsInternal,
} from "../../utils/utils.js";
import { MenuItem } from "../../types/menuItem.js";
import { getFirstLevelPages } from "../../utils/municipality/utils.js";
import { Audit, GlobalResults } from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const auditId = "municipality-menu-structure-match-model";
const greenResult =
  "Le voci del menù obbligatorie sono corrette, nell'ordine giusto e inviano a pagine interne al dominio del Comune.";
const yellowResult =
  "Le voci del menù obbligatorie e il loro ordine è corretto ma sono presenti fino a 3 voci aggiuntive. Tutte le voci inviano a pagine interne al dominio del Comune.";
const redResult =
  "Almeno una delle voci obbligatorie è assente o inesatta e/o le voci obbligatorie sono in ordine errato e/o sono presenti 8 o più voci nel menù del sito e/o sono presenti voci che inviano a pagine esterne al dominio del Comune.";
const title =
  "C.SI.1.6 - VOCI DI MENÙ DI PRIMO LIVELLO - Il sito comunale deve presentare tutte le voci di menù di primo livello, nell'esatto ordine descritto dalla documentazione del modello di sito comunale.";
const code = "C.SI.1.6";
const mainTitle = "VOCI DI MENÙ DI PRIMO LIVELLO";

const FOLDER_NAME = "municipality_menu";

class MenuAudit extends Audit {
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

  public score = 0;
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
    if (!(await redirectUrlIsInternal(page))) {
      return;
    }

    const result = {
      found_menu_voices: "",
      missing_menu_voices: "",
      wrong_order_menu_voices: "",
    };

    const firstLevelPages = await getFirstLevelPages(url, true, page);

    const foundMenuElements = firstLevelPages.map((page) => {
      return page.linkName;
    });

    result.found_menu_voices = foundMenuElements.join(", ");

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
    result.missing_menu_voices = missingMandatoryElements.join(", ");

    const orderResult = checkOrderLoose(menuItem, foundMenuElements);
    if (!orderResult.inOrder) {
      if (
        orderResult.singleMove.length > 0 &&
        orderResult.singleMove.length <= 2
      ) {
        result.wrong_order_menu_voices = orderResult.singleMove.join(", ");
      } else {
        result.wrong_order_menu_voices = "Più di una voce non in ordine";
      }
    }

    const containsMandatoryElementsResult =
      missingMandatoryElements.length === 0;

    if (
      foundMenuElements.length === 4 &&
      containsMandatoryElementsResult &&
      orderResult.inOrder
    ) {
      this.score = 1;
    } else if (
      foundMenuElements.length > 4 &&
      foundMenuElements.length < 8 &&
      containsMandatoryElementsResult &&
      orderResult.inOrder
    ) {
      this.score = 0.5;
    }

    if (this.globalResults.recapItems) {
      this.globalResults.recapItems.headings = [
        "Voci del menù identificate",
        "Voci del menù mancanti",
        "Voci del menù in ordine errato",
      ];

      this.globalResults.recapItems.pages = [result];
    }

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

      this.globalResults.pagesItems.pages.push(item);
    }

    this.globalResults.score = this.score;

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

  async returnGlobal() {
    return this.globalResults;
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
