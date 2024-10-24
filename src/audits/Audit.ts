import { Page } from "puppeteer";
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
  details: {
    items: Record<string, unknown>[];
    type: string;
    summary: string;
  };
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

  protected auditId = "audit";

  constructor() {}

  async auditPage(
    page: Page | null,
    url: string,
    error?: string,
    pageType?: string | null,
  ): Promise<unknown> {
    console.log(page, url, error, pageType);
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
      status = "average";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
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

export { Audit };
