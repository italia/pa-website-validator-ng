"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import {
  buildUrl,
  isInternalUrl,
  redirectUrlIsInternal,
  urlExists,
} from "../../utils/utils.js";
import isEmail from "validator/lib/isEmail.js";
import { Page } from "puppeteer";
import { Audit, GlobalResults } from "../Audit.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const auditId = "municipality-inefficiency-report";
const code = "C.SI.2.4";
const mainTitle = "SEGNALAZIONE DISSERVIZIO";
const greenResult =
  "Il link è nel footer, la pagina di destinazione esiste e la label è nominata correttamente.";
const yellowResult =
  "Il link è nel footer, la pagina di destinazione esiste ma la label non è nominata correttamente.";
const dataElementResult =
  "Non è stato trovato il data-element 'report-inefficiency'";
const redResult =
  "Il link non è nel footer o la pagina di destinazione è inesistente.";
const title =
  "C.SI.2.4 - SEGNALAZIONE DISSERVIZIO - Il sito comunale deve fornire al cittadino la possibilità di segnalare un disservizio, tramite email o servizio dedicato.";

const FOLDER_NAME = "municipality_inefficiency_report_audit";

class InefficiencyAudit extends Audit {
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

  async auditPage(page: Page, url: string) {
    if (!(await redirectUrlIsInternal(page))) {
      return;
    }

    this.globalResults.pagesItems.headings = [
      "Testo del link",
      "Pagina di destinazione",
      "Pagina esistente",
      "Viene usato il servizio dedicato",
    ];

    const items = [
      {
        link_name: "",
        link: "",
        existing_page: "No",
        is_service: "No",
      },
    ];

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    const reportInefficiencyElement = $("footer").find(
      '[data-element="report-inefficiency"]',
    );

    const elementObj = $(reportInefficiencyElement).attr();

    if (!elementObj) {
      this.globalResults.intermediateMessage = true;
    }

    const label = reportInefficiencyElement.text().trim().toLowerCase() ?? "";
    items[0].link_name = label;
    items[0].link = elementObj?.href ?? "";

    if (
      elementObj &&
      "href" in elementObj &&
      elementObj.href !== "#" &&
      elementObj.href !== ""
    ) {
      if (isMailto(elementObj.href.replace(" ", ""))) {
        items[0].link = elementObj.href;
        items[0].existing_page = "N/A";
      } else {
        let pageUrl = elementObj.href;
        if ((await isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
          pageUrl = await buildUrl(url, pageUrl);
        }

        const checkUrl = await urlExists(url, pageUrl);
        items[0].link = checkUrl.inspectedUrl;

        if (!checkUrl.result) {
          this.score = 0;
          this.globalResults.score = 0;

          this.globalResults.pagesItems.pages = items;

          return {
            score: 0,
          };
        }

        items[0].existing_page = "Sì";

        const parts = new URL(pageUrl).pathname.split("/");
        if (parts[1] === "servizi") {
          items[0].is_service = "Sì";
        }
      }

      if (
        label !== "disservizio" &&
        label !== "segnala disservizio" &&
        label !== "segnalazione disservizio"
      ) {
        this.score = 0.5;
        this.globalResults.score = 0.5;

        this.globalResults.pagesItems.pages = items;

        return {
          score: 0.5,
        };
      }

      this.score = 1;
      this.globalResults.score = 1;
      this.globalResults.pagesItems.pages = items;
    }

    return {
      score: this.score,
    };
  }

  async getType() {
    return auditId;
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
    } else if (this.globalResults.intermediateMessage) {
      status = "fail";
      message = dataElementResult;
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

  static getInstance(): InefficiencyAudit {
    if (!InefficiencyAudit.instance) {
      InefficiencyAudit.instance = new InefficiencyAudit();
    }
    return <InefficiencyAudit>InefficiencyAudit.instance;
  }
}

export { InefficiencyAudit };
export default InefficiencyAudit.getInstance;

const isMailto = (str: string) => {
  if (!str.startsWith("mailto:")) return false;
  const end = str.indexOf("?");
  const emails = str.slice(7, end >= 0 ? end : undefined);
  return emails.split(",").every((e) => isEmail(e));
};
