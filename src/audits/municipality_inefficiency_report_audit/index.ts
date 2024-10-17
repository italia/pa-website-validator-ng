"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { buildUrl, isInternalUrl, urlExists } from "../../utils/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import isEmail from "validator/lib/isEmail.js";
import { Page } from "puppeteer";
import {Audit, GlobalResults} from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

const auditId = "municipality-inefficiency-report";
const auditData = auditDictionary[auditId];

class InefficiencyAudit extends Audit {
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

  code = "C.SI.2.4";
  mainTitle = "SEGNALAZIONE DISSERVIZIO";

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
      this.globalResults.details.items = [
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ];
      this.globalResults.details.type = "table";

      this.globalResults.details.summary = "";

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
        "Pagina di destinazione",
        "Pagina esistente",
        "Viene usato il servizio dedicato",
      ];

      const items = [
        {
          result: auditData.redResult,
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

      const label = reportInefficiencyElement.text().trim().toLowerCase() ?? "";
      items[0].link_name = label;
      items[0].link = elementObj?.href ?? "";

      if (
        elementObj &&
        "href" in elementObj &&
        elementObj.href !== "#" &&
        elementObj.href !== ""
      ) {
        if (isMailto(elementObj.href)) {
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
            this.globalResults.details.items = items;
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
          items[0].result = auditData.yellowResult;
          this.score = 0.5;
          this.globalResults.details.items = items;
          this.globalResults.score = 0.5;

          this.globalResults.pagesItems.pages = items;

          return {
            score: 0.5,
          };
        }

        items[0].result = auditData.greenResult;

        this.score = 1;
        this.globalResults.details.items = items;
        this.globalResults.score = 1;

        this.globalResults.pagesItems.pages = items;
      }

      return {
        score: this.score,
      };
    }
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

  static getInstance(): Promise<InefficiencyAudit> {
    if (!InefficiencyAudit.instance) {
      InefficiencyAudit.instance = new InefficiencyAudit("", [], []);
    }
    return InefficiencyAudit.instance;
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
