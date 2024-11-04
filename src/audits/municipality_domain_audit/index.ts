"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { domains } from "./allowedDomain.js";
import { urlExists } from "../../utils/utils.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";
import { DataElementError } from "../../utils/DataElementError.js";

class DomainAudit extends Audit {
  auditId = "municipality-domain";
  code = "C.SI.5.2";
  mainTitle = "DOMINIO ISTITUZIONALE";
  title =
    "C.SI.5.2 - DOMINIO ISTITUZIONALE - Il sito comunale utilizza un dominio istituzionale secondo le modalità indicate nella documentazione del modello di sito comunale.";
  greenResult =
    'Tutte le pagine analizzate sono raggiungibili senza che sia necessario inserire "www." e il dominio utilizzato è corretto.';
  redResult =
    'Almeno una delle pagine analizzate non è raggiungibile senza inserire "www." o il dominio utilizzato è errato.';
  subItem = {
    greenResult:
      'Pagine raggiungibili senza che sia necessario inserire "www." e nelle quali il dominio utilizzato è corretto:',
    yellowResult: "",
    redResult:
      'Pagine non raggiungibili senza inserire "www." o nelle quali il dominio utilizzato è errato:',
  };

  public globalResults: GlobalResultsMulti = {
    score: 1,
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

  getFolderName(): string {
    return path.basename(path.dirname(fileURLToPath(import.meta.url)));
  }

  async returnErrors(
    error: DataElementError | Error | string,
    url: string,
    pageType: string,
    inError = true,
  ) {
    if (pageType !== "event") {
      if (inError) {
        this.showError = true;
      }

      this.globalResults.score = 0;

      this.globalResults.pagesInError.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];
      this.globalResults.pagesInError.message = errorHandling.errorMessage;

      this.globalResults.pagesInError.pages.push({
        link: url,
        result:
          error instanceof DataElementError || error instanceof Error
            ? error.message
            : String(error),
        show: inError,
      });

      this.globalResults.error = this.showError;
      this.score = 0;
      this.globalResults.score = 0;

      return {
        score: 0,
      };
    }
  }

  async auditPage(page: Page, url: string) {
    this.titleSubHeadings = [
      "Dominio utilizzato",
      'Viene usato il sottodominio "comune." seguito da un dominio istituzionale riservato',
      'Sito raggiungibile senza "www."',
    ];

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

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        this.subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
      }
    }

    if (this.correctItems.length > 0) {
      this.globalResults.correctPages.headings = [
        this.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";
    this.score =
      this.globalResults.pagesInError.pages.length > 0 ? 0 : this.score;
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

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
