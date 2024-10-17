import {AuditDictionary} from "../types/crawler-types";
import { Page } from "puppeteer";
import { auditDictionary } from "../storage/auditDictionary.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

export interface GlobalResults {
  score: number;
  details: {
    items: Record<string, unknown>[];
    type: string;
    summary: string;
  };
  pagesItems: {
    message: string;
    headings: string[];
    pages: Record<string, unknown>[];
  };
  recapItems?: {
    message: string,
    headings: string[],
    pages: Record<string, unknown>[],
  },
  errorMessage: string;
  info?: boolean;
  infoScore?: boolean;
  id?: string;
}

export interface GlobalResultsMulti {
  score: number;
  details: {
    items: Record<string, unknown>[];
    type: string;
    summary: string;
  };
  pagesInError: {
    message: string,
    headings: string[];
    pages: Record<string, unknown>[];
  },
  wrongPages: {
    message: string,
    headings: string[];
    pages: Record<string, unknown>[];
  },
  tolerancePages?: {
    message: string,
    headings: string[];
    pages: Record<string, unknown>[];
  },
  correctPages: {
    message: string,
    headings: string[];
    pages: Record<string, unknown>[];
  },
  errorMessage: string;
  info?: boolean;
  infoScore?: boolean;
  id?: string;
}

abstract class Audit {
  protected static instance: Audit;
  globalResults: GlobalResults | GlobalResultsMulti = {
    score: 0,
    details:  {
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
    id: '',
  };
  code = "";
  info = false;
  reportHTML = '';
  protected minVersion = "";
  mainTitle = "";

  protected auditId = "audit";
  protected auditData: AuditDictionary = auditDictionary["audit"];

  constructor() {}

  async auditPage(
    page: Page | null,
    url: string,
    error?: string,
    pageType?: string | null,
  ) : Promise<unknown> {
    console.log(page, url, error, pageType)
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

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      (status = "pass");
      (message = this.auditData.greenResult);
    } else if ((this.globalResults.score === 0.5)) {
      (status = "average");
      (message = this.auditData.yellowResult);
    } else {
      (status = "fail");
      (message = this.auditData.redResult);
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(
      __dirname + "../report/partials/audit/template.ejs",
      {
        ...(await this.meta()),
        code: this.code,
        table: this.globalResults.details,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
  }

  SCORING_MODES = {
    NUMERIC: "numeric",
    BINARY: "binary",
    MANUAL: "manual",
    INFORMATIVE: "informative",
    NOT_APPLICABLE: "notApplicable",
    ERROR: "error",
  };
}

export {Audit}
