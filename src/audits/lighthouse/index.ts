import {Audit} from "../Audit.js";

import lighthouse from "lighthouse";
import {Page} from "puppeteer";
import {initializePuppeteer} from "../../PuppeteerInstance.js";
import * as ejs from "ejs";
import municipalityOnlineConfig from "../../config/lighthouse-municipality-config-online.js";
import {fileURLToPath} from "url";
import path from "path";

class lighthouseAudit extends Audit {
  auditId = "lighthouse";
  code = "C.SI.4.1";
  mainTitle = "LIGHTHOUSE";
  metricsResult = {};
  displayMetrics = [
    "first-contentful-paint",
    "interactive",
    "speed-index",
    "total-blocking-time",
    "largest-contentful-paint",
    "cumulative-layout-shift",
  ];

  reportJSON = {};
  reportHTML = "";

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: "table",
      headings: [],
      summary: "",
    },
    errorMessage: "",
  };

  async auditPage(page: Page | null) {
    if (page) {
      const browser = await initializePuppeteer();
      const browserWSEndpoint = browser.wsEndpoint();
      const { port } = new URL(browserWSEndpoint);

      const options = {
        logLevel: process.env["logsLevel"],
        output: ["html", "json"],
        port: port,
        municipalityOnlineConfig,
        maxWaitForLoad: 300000,
        locale: "it",
      };

      const url = page.url();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const runnerResult = await this.runLighthouse(url, options);

      if (runnerResult.report.length < 2) {
        throw new Error("Missing JSON or HTML report");
      }

      const metrics = runnerResult.lhr.audits.metrics;
      const lhrAudits = runnerResult.lhr.audits;
      const metricsScore = metrics.score;
      const metricsDetails = metrics.details;
      const performanceScore = runnerResult.lhr.categories.performance.score;
      const items = metricsDetails.items[0];

      const metricsResult = [];

      // "interactive": {
      //     "id": "interactive",
      //     "title": "Time to Interactive",
      //     "description": "La metrica Tempo all'interattività indica il tempo necessario affinché la pagina diventi completamente interattiva. [Ulteriori informazioni](https://web.dev/interactive/).",
      //     "score": 0.98,
      //     "scoreDisplayMode": "numeric",
      //     "numericValue": 2575.035,
      //     "numericUnit": "millisecond",
      //     "displayValue": "2,6 s"
      //   },

      for (const metricId of this.displayMetrics) {
        if (Object.keys(lhrAudits).includes(metricId)) {
          const metric = lhrAudits[metricId];

          const score = metric.score;
          let status = "pass";
          if (score * 100 < 50) {
            status = "fail";
          } else if (score * 100 < 90) {
            status = "average";
          }

          metricsResult.push({
            status: status,
            title: metric.title,
            result: metric.displayValue,
            description: metric.description,
          });
        }
      }

      this.globalResults.score = performanceScore;
      this.metricsResult = metricsResult;
      this.reportHTML = runnerResult.report[0];
      this.reportJSON = runnerResult.report[1];

      this.globalResults.details.items = JSON.parse(
        runnerResult.report[1],
      ).audits;

      return;
    }

    return;
  }

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async runLighthouse(url: string, options: any): Promise<any> {
    try {
      return await lighthouse(url, options);
    } catch (error) {
      console.error("Error running Lighthouse:", error);
      throw error;
    }
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobalHTML() {
    const message = "";
    const score = this.globalResults.score;

    let status = "pass";
    if (score * 100 < 50) {
      status = "fail";
    } else if (score * 100 < 90) {
      status = "average";
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return await ejs.renderFile(
        __dirname + "/template.ejs",
        {
          ...(await this.meta()),
          code: this.code,
          table: this.globalResults.details,
          status,
          statusMessage: message,
          metrics: this.metricsResult,
          totalPercentage: score,
        },
    );
  }

  static getInstance(): Promise<lighthouseAudit> {
    if (!lighthouseAudit.instance) {
      lighthouseAudit.instance = new lighthouseAudit("", [], []);
    }
    return lighthouseAudit.instance;
  }
}

export { lighthouseAudit };
export default lighthouseAudit.getInstance;
