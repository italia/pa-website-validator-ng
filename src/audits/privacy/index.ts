"use strict";

import { CheerioAPI } from "cheerio";

import { urlExists } from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import * as cheerio from "cheerio";

class PrivacyAudit extends Audit {
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

  code = "";
  mainTitle = "";
  title = "";

  async meta() {
    return {
      id: this.auditId,
      title: this.title,
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page, url: string) {
    let score = 0;

    const items = [
      {
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
        items[0].existing_page = "Sì";
        items[0].secure_page = "Sì";
        score = 1;
      }
    }

    this.globalResults.score = score;
    this.globalResults.id = this.auditId;

    this.globalResults.pagesItems.pages = items;
    this.globalResults.pagesItems.headings = [
      "Testo del link",
      "Pagina di destinazione del link",
      "Pagina esistente",
      "Pagina sicura",
    ];

    return {
      score: score,
    };
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  static getInstance(): PrivacyAudit {
    if (!PrivacyAudit.instance) {
      PrivacyAudit.instance = new PrivacyAudit();
    }
    return <PrivacyAudit>PrivacyAudit.instance;
  }
}

export { PrivacyAudit };
export default PrivacyAudit.getInstance;
