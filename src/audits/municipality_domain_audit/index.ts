"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { domains } from "./allowedDomain.js";
import { urlExists } from "../../utils/utils.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import {Audit, GlobalResultsMulti} from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class DomainAudit extends Audit {
  auditId = "municipality-domain";
  code = "C.SI.5.2";
  mainTitle = "DOMINIO ISTITUZIONALE";
  title = "C.SI.5.2 - DOMINIO ISTITUZIONALE - Il sito comunale utilizza un dominio istituzionale secondo le modalità indicate nella documentazione del modello di sito comunale.";
  greenResult = 'Tutte le pagine analizzate sono raggiungibili senza che sia necessario inserire "www." e il dominio utilizzato è corretto.'; 
  redResult = 'Almeno una delle pagine analizzate non è raggiungibile senza inserire "www." o il dominio utilizzato è errato.';
  subItem = {
      greenResult:
        'Pagine raggiungibili senza che sia necessario inserire "www." e nelle quali il dominio utilizzato è corretto:',
      yellowResult: "",  
      redResult:
        'Pagine non raggiungibili senza inserire "www." o nelle quali il dominio utilizzato è errato:',
  };
    
  public globalResults: GlobalResultsMulti = {
    score: 1,
    details: {
      items: [],
      type: "table",
      summary: "",
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    wrongPages: {
      message: "",
      headings: [],
      pages: [],
    },
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      
    };
  }

  async auditPage(
    page: Page | null,
    url: string,
    error?: string,
    pageType?: string | null,
  ) {
    this.titleSubHeadings = [
      "Dominio utilizzato",
      'Viene usato il sottodominio "comune." seguito da un dominio istituzionale riservato',
      'Sito raggiungibile senza "www."',
    ];

    if (error && !page && pageType !== "event") {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        domain: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      const hostname = new URL(url).hostname.replace("www.", "");
      const item = {
        link: url,
        domain: hostname,
        correct_domain: "No",
        www_access: "",
      };

      let correctDomain = false;
      for (const domain of domains) {
        if (
          hostname === "comune." + domain ||
          hostname.endsWith(".comune." + domain)
        ) {
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
      } else {
        this.wrongItems.push(item);
        this.score = 0;
      }
    }

    return {
      score: this.score,
    };
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    const results = [];
    switch (this.score) {
      case 1:
        results.push({
          result: this.greenResult,
        });
        break;
      case 0:
        results.push({
          result: this.redResult,
        });
        break;
    }

    if (this.pagesInError.length) {
      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_domain: errorHandling.errorColumnTitles[1],
        title_correct_domain: "",
        title_www_access: "",
      });

      this.globalResults.pagesInError.message = errorHandling.errorMessage;
      this.globalResults.pagesInError.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];

      for (const item of this.pagesInError) {
        this.globalResults.pagesInError.pages.push(item);

        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: this.subItem.redResult,
        title_domain: this.titleSubHeadings[0],
        title_correct_domain: this.titleSubHeadings[1],
        title_www_access: this.titleSubHeadings[2],
      });

      this.globalResults.wrongPages.headings = [
        this.subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
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
        result: this.subItem.greenResult,
        title_domain: this.titleSubHeadings[0],
        title_correct_domain: this.titleSubHeadings[1],
        title_www_access: this.titleSubHeadings[2],
      });

      this.globalResults.correctPages.headings = [
        this.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
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
    this.globalResults.score = this.score;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else {
      status = "fail";
      message = this.redResult;
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

  static getInstance(): DomainAudit {
    if (!DomainAudit.instance) {
      DomainAudit.instance = new DomainAudit();
    }
    return <DomainAudit>DomainAudit.instance;
  }
}

export { DomainAudit };
export default DomainAudit.getInstance;
