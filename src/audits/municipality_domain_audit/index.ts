"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { domains } from "../../storage/municipality/allowedDomains.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { urlExists } from "../../utils/utils.js";
import {  getSecondLevelPages } from "../../utils/municipality/utils.js";
import { DataElementError } from "../../utils/DataElementError.js";
import { notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import { primaryMenuItems } from "../../storage/municipality/menuItems.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import {ContactAssistencyAudit} from "../municipality_contacts_assistency_audit";

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

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null
  ){

    if(page){

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

      let pagesToBeAnalyzed = [];
      let url = '';
      try {
        url = page.url();

        const secondLevelPages = await getSecondLevelPages(url, false);
        for (const [key, primaryMenuItem] of Object.entries(primaryMenuItems)) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const secondLevelPagesSection = secondLevelPages[key];
          for (const page of secondLevelPagesSection) {
            if (
                primaryMenuItem.dictionary.includes(page.linkName.toLowerCase())
            ) {
              pagesToBeAnalyzed.push(page.linkUrl);
            }
          }
        }
      } catch (ex) {
        if (!(ex instanceof DataElementError)) {
          throw ex;
        }

        this.globalResults.details.items = [{ key: "result", itemType: "text", text: "Risultato" }];
        this.globalResults.details.headings = [
          {
            result: notExecutedErrorMessage.replace("<LIST>", ex.message),
          },
        ];
        this.score = 0;

        return {
          score: 0,
        }
      }

      pagesToBeAnalyzed = [...new Set(pagesToBeAnalyzed)];

      const originHostname = new URL(url).hostname.replace("www.", "");
      for (const pageToBeAnalyzed of pagesToBeAnalyzed) {
        const hostname = new URL(pageToBeAnalyzed).hostname.replace("www.", "");
        const item = {
          inspected_page: pageToBeAnalyzed,
          domain: hostname,
          correct_domain: "No",
          www_access: "",
        };

        let correctDomain = false;
        for (const domain of domains) {
          if (
              hostname === "comune." + domain ||
              (hostname != originHostname && hostname.endsWith(".comune." + domain))
          ) {
            correctDomain = true;
            item.correct_domain = "Sì";
            break;
          }
        }

        const pageWithoutWww = new URL(pageToBeAnalyzed);
        pageWithoutWww.hostname = pageWithoutWww.hostname.replace(/^www\./i, "");
        const wwwAccess = (await urlExists(url, pageWithoutWww.href)).result;

        item.www_access = wwwAccess ? "Sì" : "No";

        if (correctDomain && wwwAccess) {
          this.correctItems.push(item);
          continue;
        }
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
