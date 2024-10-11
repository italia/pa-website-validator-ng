import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import {CheerioAPI} from "cheerio";
import * as cheerio from "cheerio";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import * as ejs from "ejs";

const auditId = "municipality-performance-improvement-plan";

const improvementPlan = /piano di miglioramento del sito/i;

class ImprovementPlanAudit extends Audit {
  public score = 0;

  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    pagesItems: {
      message: '',
      headings: [],
      pages: [],
    },
    errorMessage: '',
    info: true,
    infoScore: false
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

  async auditPage(
      page: Page | null,
      error?: string
  ) {

    if (error && !page) {

      this.globalResults['score'] = 0;
      this.globalResults['details']['items'] =  [
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ];
      this.globalResults['details']['type'] = 'table';
      this.globalResults['details']['headings'] = [{key: "result", itemType: "text", text: "Risultato"}];
      this.globalResults['details']['summary'] = '';

      return {
        score: 0,
      }
    }

    if (page) {
      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const footer = $("footer").text();

      if (footer.match(improvementPlan)) {
        this.score = 1;
        return {score: 1};
      } else {
        this.score = 0.5;
        return {score: 0.5};
      }
    }
  }

  async getType(){
    return auditId;
  }

  async returnGlobal() {
    this.globalResults.score = this.score;
    return {
      score: this.score
    };
  }

  async returnGlobalHTML() {
    let status = 'fail'
    let message = ''

    if (this.score > 0.5) {
      status = 'pass';
      message = this.auditData.greenResult;
    } else {
      status = 'average';
      message = this.auditData.yellowResult
    }

    const reportHtml = await ejs.renderFile('src/audits/municipality_improvement_plan/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults, status, statusMessage: message, metrics: null ,  totalPercentage : null });
    return reportHtml
  }

  static getInstance(): Promise<ImprovementPlanAudit> {
    if (!ImprovementPlanAudit.instance) {
      ImprovementPlanAudit.instance = new ImprovementPlanAudit('', [], []);
    }
    return ImprovementPlanAudit.instance;
  }
}

export { ImprovementPlanAudit };
export default ImprovementPlanAudit.getInstance;
