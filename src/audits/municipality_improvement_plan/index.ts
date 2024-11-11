import { Audit, GlobalResults } from "../Audit.js";
import { Page } from "puppeteer";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const auditId = "municipality-performance-improvement-plan";

const improvementPlan = /piano di miglioramento del sito/i;

const FOLDER_NAME = "municipality_improvement_plan";

class ImprovementPlanAudit extends Audit {
  public score = 0;

  public globalResults: GlobalResults = {
    score: 0,
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  async meta() {
    return {
      id: auditId,
      title: "Il sito ha un link al piano di miglioramento nel footer",
      code: "",
      mainTitle: "",
      auditId: auditId,
      failureTitle:
        "Il sito non ha un link al piano di miglioramento nel footer",
    };
  }

  getFolderName(): string {
    return FOLDER_NAME;
  }

  async auditPage(page: Page) {
    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    const footer = $("footer").text();

    if (footer.match(improvementPlan)) {
      this.score = 1;
      return { score: 1 };
    } else {
      this.score = 0.5;
      return { score: 0.5 };
    }
  }

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    this.globalResults.score = this.score;
    return {
      score: this.score,
    };
  }

  async returnGlobalHTML() {
    let status = "fail";
    if (this.score > 0.5) {
      status = "info";
    } else {
      status = "average";
    }

    return await ejs.renderFile(__dirname + `/${FOLDER_NAME}/template.ejs`, {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): ImprovementPlanAudit {
    if (!ImprovementPlanAudit.instance) {
      ImprovementPlanAudit.instance = new ImprovementPlanAudit();
    }
    return <ImprovementPlanAudit>ImprovementPlanAudit.instance;
  }
}

export { ImprovementPlanAudit };
export default ImprovementPlanAudit.getInstance;
