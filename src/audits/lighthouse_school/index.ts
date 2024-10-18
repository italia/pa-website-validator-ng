import { Audit, GlobalResults } from "../Audit.js";

import lighthouse, { Flags, RunnerResult } from "lighthouse";
import { Page } from "puppeteer";
import { initializePuppeteer } from "../../PuppeteerInstance.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class lighthouseAudit extends Audit {
  info = true;
  auditId = "lighthouse_school";
  code = "R.SC.3.1";
  mainTitle = "Velocità e tempi di risposta";
  title = "R.SC.3.1 - Velocità e tempi di risposta";
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

  public globalResults: GlobalResults = {
    score: 1,
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

  async auditPage(page: Page | null) {
    if (page) {
      const browser = await initializePuppeteer();
      const browserWSEndpoint = browser.wsEndpoint();
      const { port } = new URL(browserWSEndpoint);

      const __dirname = path.dirname(fileURLToPath(import.meta.url));

      const options: Flags = {
        logLevel:
          (process.env["logsLevel"] as "info" | "error" | "silent") || "info",
        output: ["html", "json"],
        port: parseInt(port),
        maxWaitForLoad: 300000,
        locale: "it",
        configPath: `${__dirname}/lighthouse-municipality-config-online.js`,
      };

      const url = page.url();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const runnerResult: RunnerResult | undefined = await this.runLighthouse(
        url,
        options,
      );

      if (runnerResult) {
        if (runnerResult.report.length < 2) {
          throw new Error("Missing JSON or HTML report");
        }

        const lhrAudits = runnerResult.lhr.audits;

        const performanceScore = runnerResult.lhr.categories.performance.score;

        const metricsResult = [];

        for (const metricId of this.displayMetrics) {
          if (Object.keys(lhrAudits).includes(metricId)) {
            const metric = lhrAudits[metricId];

            const score = metric.score;
            let status = "fail";
            if (score) {
              if (score * 100 > 90) {
                status = "pass";
              } else if (score * 100 > 50) {
                status = "average";
              }
            }

            metricsResult.push({
              status: status,
              title: metric.title,
              result: metric.displayValue,
              description: metric.description,
            });
          }
        }

        this.globalResults.score = performanceScore ? performanceScore : 0;
        this.metricsResult = metricsResult;
        this.reportHTML = runnerResult.report[0];
        this.reportJSON = runnerResult.report[1];

        this.globalResults.details.items = JSON.parse(
          runnerResult.report[1],
        ).audits;
      }

      return;
    }

    return;
  }

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async runLighthouse(
    url: string,
    options: Flags,
  ): Promise<RunnerResult | undefined> {
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

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults.details,
      status,
      statusMessage: message,
      metrics: this.metricsResult,
      totalPercentage: score,
    });
  }

  static getInstance(): lighthouseAudit {
    if (!lighthouseAudit.instance) {
      lighthouseAudit.instance = new lighthouseAudit();
    }
    return <lighthouseAudit>lighthouseAudit.instance;
  }
}

export { lighthouseAudit };
export default lighthouseAudit.getInstance;
