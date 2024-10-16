"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {domains} from "./allowedDomain.js";
import {auditDictionary} from "../../storage/auditDictionary.js";
import {urlExists} from "../../utils/utils.js";
import {errorHandling} from "../../config/commonAuditsParts.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as ejs from "ejs";
import {fileURLToPath} from "url";
import path from "path";

class DomainAudit extends Audit {
  auditId = "municipality-domain";
  auditData = auditDictionary["municipality-domain"];
  code = "C.SI.5.2";
  mainTitle = "DOMINIO ISTITUZIONALE";
  mainDescription =
    "Il sito comunale utilizza un dominio istituzionale secondo le modalità indicate nella documentazione del modello di sito comunale.";
  minRequirement =
    'il sito comunale è raggiungibile senza necessità di inserimento del sottodominio “www.” e le pagine utilizzano il sottodominio "comune." immediatamente seguito da uno dei domini utilizzabili presenti in [questa pagina](https://raw.githubusercontent.com/italia/pa-website-validator/main/src/storage/municipality/allowedDomains.ts) secondo la struttura indicata nel criterio di conformità;';
  automaticChecks =
    'ricercando specifici attributi "data-element" come spiegato nella Documentazione delle App di valutazione, viene verificato che il dominio utilizzato nelle pagine analizzate rispetti la struttura richiesta dal criterio di conformità e che le pagine siano raggiungibili senza necessità di inserimento del sottodominio "www."; ';
  failures = "Elementi di fallimento:";

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: "table",
      headings: [],
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
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError: any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings: any = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      mainDescription: this.mainDescription,
      minRequirement: this.minRequirement,
      automaticChecks: this.automaticChecks,
      failures: this.failures,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
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
          result: this.auditData.greenResult,
        });
        break;
      case 0:
        results.push({
          result: this.auditData.redResult,
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
        result: this.auditData.subItem.redResult,
        title_domain: this.titleSubHeadings[0],
        title_correct_domain: this.titleSubHeadings[1],
        title_www_access: this.titleSubHeadings[2],
      });

      this.globalResults.wrongPages.headings = [
        this.auditData.subItem.redResult,
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
        result: this.auditData.subItem.greenResult,
        title_domain: this.titleSubHeadings[0],
        title_correct_domain: this.titleSubHeadings[1],
        title_www_access: this.titleSubHeadings[2],
      });

      this.globalResults.correctPages.headings = [
        this.auditData.subItem.greenResult,
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
    this.globalResults.details.headings = this.headings;
    this.globalResults.score = this.score;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return await ejs.renderFile(
        __dirname + "/template.ejs",
        {
          ...(await this.meta()),
          code: this.code,
          table: this.globalResults,
          status,
          statusMessage: message,
          metrics: null,
          totalPercentage: null,
        },
    );
  }

  static getInstance(): Promise<DomainAudit> {
    if (!DomainAudit.instance) {
      DomainAudit.instance = new DomainAudit("", [], []);
    }
    return DomainAudit.instance;
  }
}

export { DomainAudit };
export default DomainAudit.getInstance;
