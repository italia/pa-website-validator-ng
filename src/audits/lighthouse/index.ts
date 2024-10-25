import { Audit, GlobalResults } from "../Audit.js";

import lighthouse, { Flags, RunnerResult } from "lighthouse";
import { Page } from "puppeteer";
import { initializePuppeteer } from "../../PuppeteerInstance.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class lighthouseAudit extends Audit {
  auditId = "lighthouse";
  code = "C.SI.4.1";
  mainTitle = "Velocità e tempi di risposta";
  title = "C.SI.4.1 - Velocità e tempi di risposta";

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

  async auditPage(page: Page) {
    const browser = await initializePuppeteer();
    const browserWSEndpoint = browser.wsEndpoint();
    const { port } = new URL(browserWSEndpoint);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const options: Flags = {
      logLevel:
        (process.env["logsLevel"] as "info" | "error" | "silent") || "info",
      output: ["html", "json"],
      port: parseInt(port),
      maxWaitForLoad: parseInt(process.env["requestTimeout"] ?? "300000"),
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

  async returnGlobalHTML(passPlan: boolean) {
    const message = "";
    const score = this.globalResults.score;

    let status = "pass";
    if (passPlan) {
      status = "pass_plan";
    } else if (score * 100 < 50) {
      status = "fail";
    } else if (score * 100 < 90) {
      status = "average";
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
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
