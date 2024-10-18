import {Audit, GlobalResults} from "../Audit.js";
import { Page } from "puppeteer";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

const auditId = "municipality-performance-improvement-plan";

const improvementPlan = /piano di miglioramento del sito/i;

class ImprovementPlanAudit extends Audit {
  public score = 0;

  public globalResults: GlobalResults = {
    score: 0,
    details: {
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
  };

  async meta() {
    return {
      id: auditId,
      title: "Il sito ha un link al piano di miglioramento nel footer",
      failureTitle:
        "Il sito non ha un link al piano di miglioramento nel footer",
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(page: Page | null, error?: string) {
    if (error && !page) {
      this.globalResults.score = 0;

      this.globalResults.error = true;


      return {
        score: 0,
      };
    }

    if (page) {
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
    let message = "";

    if (this.score > 0.5) {
      status = "info";
      message = this.greenResult;
    } else {
      status = "average";
      message = this.yellowResult;
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

  static getInstance(): ImprovementPlanAudit {
    if (!ImprovementPlanAudit.instance) {
      ImprovementPlanAudit.instance = new ImprovementPlanAudit();
    }
    return <ImprovementPlanAudit>ImprovementPlanAudit.instance;
  }
}

export { ImprovementPlanAudit };
export default ImprovementPlanAudit.getInstance;
