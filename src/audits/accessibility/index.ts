"use strict";

import { CheerioAPI } from "cheerio";

import { getAllPageHTML, urlExists } from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import * as cheerio from "cheerio";

class A11yAudit extends Audit {
  mainTitle = "";
  code = "";
  title = "";

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
    errorMessage: "",
  };

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page, url: string) {
    this.globalResults.pagesItems.headings = [
      "Testo del link",
      "Pagina di destinazione del link",
      "Pagina esistente",
      "La pagina contiene l'url del sito di origine",
      "È dichiarata la conformità alle specifiche WCAG 2.1",
    ];

    const items = [
      {
        link_name: "",
        link: "",
        existing_page: "No",
        page_contains_correct_url: "",
        wcag: "",
      },
    ];

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    const accessibilityDeclarationElement = $("footer").find(
      '[data-element="accessibility-link"]',
    );
    const elementObj = $(accessibilityDeclarationElement).attr();
    items[0].link_name = accessibilityDeclarationElement.text().trim() ?? "";
    items[0].link = elementObj?.href ?? url;

    if (!elementObj) {
      this.globalResults.intermediateMessage = true;
    }

    if (
      elementObj &&
      "href" in elementObj &&
      elementObj.href !== "#" &&
      elementObj.href !== ""
    ) {
      const href = elementObj.href;
      const checkUrl = await urlExists(url, href);

      if (checkUrl.exception)
        throw new Error("Possibile errore del server AGID, verificare.");

      if (!checkUrl.result) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      items[0].existing_page = "Sì";
      items[0].page_contains_correct_url = "No";
      items[0].wcag = "No";

      if (!href.includes("https://form.agid.gov.it/view/")) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      const domain = new URL(url).host.replace(/^www./, "");

      const privacyPageHTML: string = await getAllPageHTML(href);
      if (!privacyPageHTML.match(new RegExp(domain, "i"))) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      items[0].page_contains_correct_url = "Sì";

      if (
        !privacyPageHTML.match(/wcag 2.1/i) &&
        !privacyPageHTML.match(/wcag-21/i)
      ) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      } else {
        items[0].wcag = "Sì";
      }

      this.globalResults.score = 1;
    }

    this.globalResults.id = this.auditId;
    this.globalResults.pagesItems.pages = items;

    return {
      score: this.globalResults.score,
    };
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  static getInstance(): A11yAudit {
    if (!A11yAudit.instance) {
      A11yAudit.instance = new A11yAudit();
    }
    return <A11yAudit>A11yAudit.instance;
  }
}

export { A11yAudit };
export default A11yAudit.getInstance;
