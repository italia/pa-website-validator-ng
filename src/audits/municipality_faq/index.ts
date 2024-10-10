"use strict";

import { CheerioAPI } from "cheerio";
import { urlExists } from "../../utils/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";

const auditId = "municipality-faq-is-present";
const auditData = auditDictionary[auditId];
const greenResult = auditData.greenResult;
const yellowResult = auditData.yellowResult;
const redResult = auditData.redResult;

class FaqAudit extends Audit {
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

  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async getType(){
    return auditId;
  }

  async auditPage(
    page: Page | null,
    error?: string
  ) {
    if(error && !page){

      this.globalResults.score = 0;
      this.globalResults.details.items.push(
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      );
      this.globalResults.details.headings= [{ key: "result", itemType: "text", text: "Risultato" }];

      return {
        score: 0,
      }
    }

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
          itemType: "text",
          text: "Pagina di destinazione",
        },
        {
          key: "existing_page",
          itemType: "text",
          text: "Pagina esistente",
        },
      ];

      const items = [
        {
          result: redResult,
          link_name: "",
          link_destination: "",
          existing_page: "No",
        },
      ];

      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);
      const privacyPolicyElement = $("footer").find('[data-element="faq"]');
      const elementObj = $(privacyPolicyElement).attr();

      const label = privacyPolicyElement.text().trim().toLowerCase() ?? "";
      items[0].link_name = label;
      items[0].link_destination = elementObj?.href ?? "";

      if (
          elementObj &&
          "href" in elementObj &&
          elementObj.href !== "#" &&
          elementObj.href !== ""
      ) {
        const checkUrl = await urlExists(url, elementObj.href);
        items[0].link_destination = checkUrl.inspectedUrl;

        if (!checkUrl.result) {
          this.globalResults.details.items = items;
          this.globalResults.details.headings = this.headings;
          this.globalResults.score = 0;
          this.score = 0;

          return {
            score: 0,
          };
        }

        items[0].existing_page = "Sì";

        if (!label.includes("faq") && !label.includes("domande frequenti")) {
          items[0].result = yellowResult;
          this.globalResults.details.items = items;
          this.globalResults.details.headings = this.headings;
          this.globalResults.score = 0.5;
          this.score = 0.5;
          return {
            score: 0.5,
          };
        }

        items[0].result = greenResult;
        this.globalResults.details.items = items;
        this.globalResults.details.headings = this.headings;
        this.globalResults.score = 1;
        this.score = 1;
      }
    }


    return {
      score: this.score,
    };
  }

  static getInstance(): Promise<FaqAudit> {
    if (!FaqAudit.instance) {
      FaqAudit.instance = new FaqAudit('',[],[]);
    }
    return FaqAudit.instance;
  }

}

export { FaqAudit };
export default FaqAudit.getInstance;
