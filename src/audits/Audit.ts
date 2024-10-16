import crawlerTypes from "../types/crawler-types";
import { Page } from "puppeteer";
import { auditDictionary } from "../storage/auditDictionary.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import PageData = crawlerTypes.PageData;

export abstract class Audit {
  id: string;
  gathererPageType: string[];
  auditsIds: string[];
  protected static instance: any;
  globalResults: any = {};
  code = "";
  info = false;

  protected auditId = "audit";
  protected auditData: crawlerTypes.AuditDictionary = auditDictionary["audit"];

  constructor(id: string, gathererPageType: string[], auditsIds: string[]) {
    this.id = id;
    this.gathererPageType = gathererPageType;
    this.auditsIds = auditsIds;
  }

  async auditPage(
    page: Page | null,
    url: string = "",
    error?: string,
    pageType?: string | null,
  ): Promise<any> {
    return {};
  }

  async meta() {
    return {};
  }

  async addError() {}

  async execute(page: PageData) {
    return page;
  }

  async generateTotalResult() {}

  static async getType() {
    return "";
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      (status = "pass");
      (message = this.auditData.greenResult);
    } else if ((this.globalResults.score = 0.5)) {
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
