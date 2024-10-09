"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { domains } from "./allowedDomain.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { urlExists } from "../../utils/utils.js";

import {Audit} from "../Audit.js";
import {Page} from "puppeteer";

const auditId = "municipality-domain";
const auditData = auditDictionary[auditId];

class DomainAudit extends Audit {

  public globalResults: any = {
    score: 1,
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
  public score = 1;
  private titleSubHeadings: any = [];
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

  async auditPage(
    page: Page | null,
    error?: string
  ){

    this.titleSubHeadings = [
      "Dominio utilizzato",
      'Viene usato il sottodominio "comune." seguito da un dominio istituzionale riservato',
      'Sito raggiungibile senza "www."',
    ];
    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato",
        subItemsHeading: { key: "inspected_page", itemType: "url" },
      },
      {
        key: "title_domain",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "domain",
          itemType: "text",
        },
      },
      {
        key: "title_correct_domain",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "correct_domain",
          itemType: "text",
        },
      },
      {
        key: "title_www_access",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "www_access",
          itemType: "text",
        },
      },
    ];

    if (error && !page) {
      this.score = 0;

      this.wrongItems.push({
        inspected_page: '',
        domain: '',
        correct_domain: "No",
        www_access: ""
      });

      return {
        score: 0,
      }
    }

    if(page){

      let url = page.url();

      const hostname = new URL(url).hostname.replace("www.", "");
      const item = {
        inspected_page: url,
        domain: hostname,
        correct_domain: "No",
        www_access: "",
      };

        let correctDomain = false;
        for (const domain of domains) {
          if ((hostname === "comune." + domain) || hostname.endsWith(".comune." + domain)) {
            correctDomain = true;
            item.correct_domain = "Sì";
            break;
          }
        }

        const pageWithoutWww = new URL(url);
        pageWithoutWww.hostname = pageWithoutWww.hostname.replace(/^www\./i, "");
        const wwwAccess = (await urlExists(url, pageWithoutWww.href)).result;

        item.www_access = wwwAccess ? "Sì" : "No";

        if (correctDomain && wwwAccess) {
          this.correctItems.push(item);
        }else{
          this.wrongItems.push(item);
          this.score = 0;
        }
    }

    return {
      score: this.score,
    };
  }

  async getType(){
    return auditId;
  }

  async returnGlobal(){
    const results = [];
    switch (this.score) {
      case 1:
        results.push({
          result: auditData.greenResult,
        });
        break;
      case 0:
        results.push({
          result: auditData.redResult,
        });
        break;
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: auditData.subItem.redResult,
        title_domain: this.titleSubHeadings[0],
        title_correct_domain: this.titleSubHeadings[1],
        title_www_access: this.titleSubHeadings[2],
      });

      for (const item of this.wrongItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: auditData.subItem.greenResult,
        title_domain: this.titleSubHeadings[0],
        title_correct_domain: this.titleSubHeadings[1],
        title_www_access: this.titleSubHeadings[2],
      });

      for (const item of this.correctItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    this.globalResults.details.items = results;
    this.globalResults.details.headings = this.headings;
    this.globalResults.score = this.score;

    return this.globalResults;
  }

  static getInstance(): Promise<DomainAudit> {
    if (!DomainAudit.instance) {
      DomainAudit.instance = new DomainAudit('',[],[]);
    }
    return DomainAudit.instance;
  }

}

export { DomainAudit };
export default DomainAudit.getInstance;
