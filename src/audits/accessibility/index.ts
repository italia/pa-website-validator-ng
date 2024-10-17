"use strict";

import { CheerioAPI } from "cheerio";

import { getAllPageHTML, urlExists } from "../../utils/utils.js";
import { Page } from "puppeteer";

import {Audit, GlobalResults} from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";

class A11yAudit extends Audit {
  mainTitle = "";
  code = "";

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


  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    if (error && !page) {
      this.globalResults.score = 0;
      this.globalResults.details.items.push({
        result: notExecutedErrorMessage.replace("<LIST>", error),
      });

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
      this.globalResults.pagesItems.headings = [
        "Risultato",
        "Testo del link",
        "Pagina di destinazione del link",
        "Pagina esistente",
        "La pagina contiene l'url del sito di origine",
        "È dichiarata la conformità alle specifiche WCAG 2.1",
      ]

      const items = [
        {
          result: this.auditData.redResult,
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
          this.globalResults.details.items = items;
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
          this.globalResults.details.items = items;
          this.globalResults.pagesItems.pages = items;

          return {
            score: 0,
          };
        }

        const domain = new URL(url).host.replace(/^www./, "");

        const privacyPageHTML: string = await getAllPageHTML(href); //TODO: questa funzione utilizza una nuova instanza di puppeteer, secondo me dovremmo creare un altro gatherer per questa tipologia di pagina
        if (!privacyPageHTML.match(new RegExp(domain, "i"))) {
          this.globalResults.score = 0;
          this.globalResults.details.items = items;
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
          this.globalResults.details.items = items;
          this.globalResults.pagesItems.pages = items;

          return {
            score: 0,
          };
        } else {
          items[0].wcag = "Sì";
        }

        items[0].result = this.auditData.greenResult;
        this.globalResults.score = 1;
      }

      this.globalResults.details.items = items;
      this.globalResults.id = this.auditId;
      this.globalResults.pagesItems.pages = items;

      return {
        score: this.globalResults.score,
      };
    }
  }

  async getType() {
    return this.auditId;
  }

  static getInstance(): Promise<A11yAudit> {
    if (!A11yAudit.instance) {
      A11yAudit.instance = new A11yAudit("", [], []);
    }
    return A11yAudit.instance;
  }
}

export { A11yAudit };
export default A11yAudit.getInstance;
