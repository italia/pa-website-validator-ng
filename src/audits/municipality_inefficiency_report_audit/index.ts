"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { CheerioAPI } from "cheerio";
import {
  buildUrl,
  isInternalUrl,
  urlExists,
} from "../../utils/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import isEmail from "validator/lib/isEmail.js";
import {Page} from "puppeteer";
import {Audit} from "../Audit.js";
import * as cheerio from "cheerio";

const auditId = "municipality-inefficiency-report";
const auditData = auditDictionary[auditId];

class InefficiencyAudit extends Audit {
  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    errorMessage: ''
  };
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError : any = [];
  public score = 0;
  private headings : any = [];

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null
  ) {

    if(page){
      const url = page.url();

      this.headings = [
        {
          key: "result",
          itemType: "text",
          text: "Risultato",
        },
        {
          key: "link_name",
          itemType: "text",
          text: "Testo del link",
        },
        {
          key: "link_destination",
          itemType: "url",
          text: "Pagina di destinazione",
        },
        {
          key: "existing_page",
          itemType: "text",
          text: "Pagina esistente",
        },
        {
          key: "is_service",
          itemType: "text",
          text: "Viene usato il servizio dedicato",
        },
      ];

      const items = [
        {
          result: auditData.redResult,
          link_name: "",
          link_destination: "",
          existing_page: "No",
          is_service: "No",
        },
      ];

      const data = await page.content();
      const $ : CheerioAPI = await cheerio.load(data);

      const reportInefficiencyElement = $("footer").find(
          '[data-element="report-inefficiency"]'
      );
      const elementObj = $(reportInefficiencyElement).attr();

      const label = reportInefficiencyElement.text().trim().toLowerCase() ?? "";
      items[0].link_name = label;
      items[0].link_destination = elementObj?.href ?? "";

      if (
          elementObj &&
          "href" in elementObj &&
          elementObj.href !== "#" &&
          elementObj.href !== ""
      ) {
        if (isMailto(elementObj.href)) {
          items[0].link_destination = elementObj.href;
          items[0].existing_page = "N/A";
        } else {
          let pageUrl = elementObj.href;
          if ((await isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
            pageUrl = await buildUrl(url, pageUrl);
          }

          const checkUrl = await urlExists(url, pageUrl);
          items[0].link_destination = checkUrl.inspectedUrl;

          if (!checkUrl.result) {
            this.score = 0;
            this.globalResults.details.headings = this.headings;
            this.globalResults.details.items = items;
            this.globalResults.score = 0;

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
          this.globalResults.details.headings = this.headings;
          this.globalResults.details.items = items;
          this.globalResults.score = 0.5;

          return {
            score: 0.5,
          };
        }

        items[0].result = auditData.greenResult;

        this.score = 1;
        this.globalResults.details.headings = this.headings;
        this.globalResults.details.items = items;
        this.globalResults.score = 1;
      }

      return {
        score: this.score,
      };
    }

    return;

  }


  static getInstance(): Promise<InefficiencyAudit> {
    if (!InefficiencyAudit.instance) {
      InefficiencyAudit.instance = new InefficiencyAudit('',[],[]);
    }
    return InefficiencyAudit.instance;
  }

}

export {InefficiencyAudit};
export default InefficiencyAudit.getInstance;

const isMailto = (str: string) => {
  if (!str.startsWith("mailto:")) return false;
  const end = str.indexOf("?");
  const emails = str.slice(7, end >= 0 ? end : undefined);
  return emails.split(",").every((e) => isEmail(e));
};

