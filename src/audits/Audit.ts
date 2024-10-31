import { Page } from "puppeteer";
import * as ejs from "ejs";
import { errorHandling } from "../config/commonAuditsParts.js";
import { DataElementError } from "../utils/DataElementError.js";
import { __dirname } from './esmHelpers.js';

export interface GlobalResults {
  score: number;
  pagesItems: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  pagesInError: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  recapItems?: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  errorMessage: string;
  info?: boolean;
  error?: boolean;
  id?: string;
}

export interface GlobalResultsMulti {
  score: number;
  pagesInError: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  wrongPages: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  tolerancePages?: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  correctPages: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  errorMessage: string;
  info?: boolean;
  error?: boolean;
  id?: string;
}

abstract class Audit {
  protected static instance: Audit;
  globalResults: GlobalResults | GlobalResultsMulti = {
    score: 0,
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
    id: "",
  };
  code = "";
  info = false;
  reportHTML = "";
  score = 0;
  protected minVersion = "";
  mainTitle = "";
  infoScore = false;
  title = "";
  greenResult = "";
  yellowResult = "";
  redResult = "";
  subItem = {
    greenResult: "",
    yellowResult: "",
    redResult: "",
  };
  showError = false;

  protected auditId = "audit";

  constructor() {}

  async returnErrors(
    error: DataElementError | Error | string,
    url: string,
    pageType: string,
    inError = true,
  ): Promise<Record<string, number> | undefined> {
    if (inError) {
      this.showError = true;
    }
    this.globalResults.pagesInError.message = errorHandling.errorMessage;
    this.globalResults.pagesInError.headings = [
      errorHandling.errorColumnTitles[0],
      errorHandling.errorColumnTitles[1],
    ];

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

  async auditPage(
    page: Page,
    url?: string,
    pageType?: string | null,
  ): Promise<unknown> {
    console.log(page, pageType);
    return {};
  }

  async meta() {
    return {};
  }

  async getType() {
    return "";
  }

  async returnGlobal() {
    return {};
  }

  async returnGlobalHTML(passPlan?: boolean) {
    let status = "fail";
    let message = "";

    console.log(passPlan);

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.globalResults.score === 0.5) {
      status = "pass";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    return await ejs.renderFile(
      __dirname + "../report/partials/audit/template.ejs",
      {
        ...(await this.meta()),
        code: this.code,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
  }
}

export { Audit };
