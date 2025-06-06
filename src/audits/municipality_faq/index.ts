"use strict";

import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { urlExists } from "../../utils/utils.js";
import { Audit, GlobalResults } from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const auditId = "municipality-faq-is-present";
const code = "C.SI.2.3";
const mainTitle = "RICHIESTA DI ASSISTENZA / DOMANDE FREQUENTI";
const title =
  "C.SI.2.3 - RICHIESTA DI ASSISTENZA / DOMANDE FREQUENTI - Il sito comunale deve contenere una sezione per le domande più frequenti (FAQ).";
const greenResult =
  "Il link è nel footer, la pagina di destinazione esiste e la label è nominata correttamente.";
const yellowResult =
  "Il link è nel footer, la pagina di destinazione esiste ma la label non è nominata correttamente.";
const redResult =
  "Il link non è nel footer o la pagina di destinazione è inesistente.";

const FOLDER_NAME = "municipality_faq";

class FaqAudit extends Audit {
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

  async getType() {
    return auditId;
  }

  async auditPage(page: Page, url: string) {
    this.globalResults.pagesItems.headings = [
      "Testo del link",
      "Pagina di destinazione",
      "Pagina esistente",
    ];

    const items = [
      {
        link_name: "",
        link: "",
        existing_page: "No",
      },
    ];

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);
    const privacyPolicyElement = $("footer").find('[data-element="faq"]');
    const elementObj = $(privacyPolicyElement).attr();

    const label = privacyPolicyElement.text().trim().toLowerCase() ?? "";
    items[0].link_name = label;
    items[0].link = elementObj?.href ?? "";

    if (
      elementObj &&
      "href" in elementObj &&
      elementObj.href !== "#" &&
      elementObj.href !== ""
    ) {
      const checkUrl = await urlExists(url, elementObj.href);
      items[0].link = checkUrl.inspectedUrl;

      if (!checkUrl.result) {
        this.globalResults.pagesItems.pages = items;

        this.globalResults.score = 0;
        this.score = 0;

        return {
          score: 0,
        };
      }

      items[0].existing_page = "Sì";

      if (!label.includes("faq") && !label.includes("domande frequenti")) {
        this.globalResults.pagesItems.pages = items;
        this.globalResults.score = 0.5;
        this.score = 0.5;
        return {
          score: 0.5,
        };
      }

      this.globalResults.pagesItems.pages = items;
      this.globalResults.score = 1;
      this.score = 1;
    }

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    return this.globalResults;
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

  static getInstance(): FaqAudit {
    if (!FaqAudit.instance) {
      FaqAudit.instance = new FaqAudit();
    }
    return <FaqAudit>FaqAudit.instance;
  }
}

export { FaqAudit };
export default FaqAudit.getInstance;
