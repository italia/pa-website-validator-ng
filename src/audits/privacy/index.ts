"use strict";

import { CheerioAPI } from "cheerio";

import { urlExists } from "../../utils/utils.js";
import { Page } from "puppeteer";

import {Audit, GlobalResults} from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";

class PrivacyAudit extends Audit {
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

  code = "";
  mainTitle = "";

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

      const items = [
        {
          result: this.auditData.redResult,
          link_name: "",
          link: "",
          existing_page: "No",
          secure_page: "No",
        },
      ];

      const data = await page.content();
      const $: CheerioAPI = await cheerio.load(data);

      const privacyPolicyElement = $("footer").find(
        '[data-element="privacy-policy-link"]',
      );
      const elementObj = $(privacyPolicyElement).attr();
      items[0].link_name = privacyPolicyElement.text().trim() ?? "";
      items[0].link = elementObj?.href ?? "";

      if (
        elementObj &&
        "href" in elementObj &&
        elementObj.href !== "#" &&
        elementObj.href !== ""
      ) {
        const checkUrlHttps = await urlExists(url, elementObj.href, true);

        items[0].link = checkUrlHttps.inspectedUrl;

        if (checkUrlHttps.result) {
          items[0].result = this.auditData.greenResult;
          items[0].existing_page = "Sì";
          items[0].secure_page = "Sì";
          score = 1;
        }
      }

      this.globalResults.score = score;
      this.globalResults.details.items = items;
      this.globalResults.id = this.auditId;

      this.globalResults.pagesItems.pages = items;
      this.globalResults.pagesItems.headings = [
        "Risultato",
        "Testo del link",
        "Pagina di destinazione del link",
        "Pagina esistente",
        "Pagina sicura",
      ];

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

  static getInstance(): Promise<PrivacyAudit> {
    if (!PrivacyAudit.instance) {
      PrivacyAudit.instance = new PrivacyAudit("", [], []);
    }
    return PrivacyAudit.instance;
  }
}

export { PrivacyAudit };
export default PrivacyAudit.getInstance;
