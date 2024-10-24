import { initializeConfig } from "./config/config.js";
import { collectAudits } from "./AuditManager.js";
import { collectGatherers } from "./GathererManager.js";
import { initializePuppeteer } from "./PuppeteerInstance.js";
import PageManager from "./PageManager.js";
import scan from "./Scan.js";
import { Page } from "puppeteer";
import { loadPage } from "./utils/utils.js";

export const logLevels = {
  display_none: "silent",
  display_error: "error",
  display_info: "info",
  display_verbose: "verbose",
};

async function run(
  website: string,
  type: string,
  scope: string,
  logLevel: string = logLevels.display_none,
  saveFile = true,
  destination: string,
  reportName: string,
  view: string,
  accuracy = "suggested",
  requestTimeout = 30000,
  numberOfServicePages?: number,
  concurrentPages?: number,
) {
  let finalResults: Record<string, unknown> = {};

  try {
    const config = await initializeConfig(type, scope);

    process.env["accuracy"] = accuracy;
    process.env["logsLevel"] = logLevel;

    if (numberOfServicePages) {
      process.env["numberOfServicePages"] =
        JSON.stringify(numberOfServicePages);
    }
    process.env["requestTimeout"] = requestTimeout.toString();

    const audits = await collectAudits();
    await collectGatherers();
    const browser = await initializePuppeteer();

    process.env["accuracy"] = accuracy;
    if (numberOfServicePages) {
      process.env["numberOfServicePages"] =
        JSON.stringify(numberOfServicePages);
    }

    process.env["website"] = website;
    process.env["requestTimeout"] = requestTimeout.toString();
    process.env["destination"] = destination;
    process.env["reportName"] = reportName;
    process.env["view"] = view ? String(view) : "";
    process.env["saveFile"] = saveFile ? "true" : "false";
    process.env["concurrentPages"] = concurrentPages
      ? concurrentPages.toString()
      : "20";
    process.env["type"] = type;
    //register method to the event 'page-added'
    PageManager.onPagesAdded(async (pageData) => {
      await scan(pageData);
    });

    PageManager.onPagesClosed(async (pageData) => {
      await scan(pageData);
    });

    const onScriptClosedPromise = new Promise((resolve) => {
      PageManager.onScriptClosed(async (results) => {
        finalResults = results;
        resolve(results);
      });
    });

    if (
      config.audits["homepage"].find(
        (i: string) => i === "lighthouse" || i === "lighthouse_school",
      )
    ) {
      const lighthouseId = config.audits["homepage"].find(
        (i: string) => i === "lighthouse_school",
      )
        ? "lighthouse_school"
        : "lighthouse";
      const audit = await audits[lighthouseId]();
      let page: Page | null = null;
      let navigatingError;
      try {
        page = await loadPage(website);
        if (page) {
          await page.waitForNetworkIdle();
        }
      } catch (e) {
        if (e instanceof Error) {
          navigatingError = e.message;
        } else {
          navigatingError = String(e);
        }
      }

      await audit.auditPage(
        navigatingError ? null : page,
        website,
        navigatingError ? navigatingError : "",
        "homepage",
      );
      const result = await audit.returnGlobal();
      const meta = await audit.meta();

      if (page) {
        await page.close();
      }

      await PageManager.setGlobalResults({
        lighthouse: { ...result, ...meta },
      });
    }

    await PageManager.addPage({
      id: "homepage",
      url: website,
      type: "homepage",
      redirectUrl: "",
      internal: true,
      gathered: false,
      audited: false,
    });

    await onScriptClosedPromise;

    if (browser) {
      console.error("closing puppeteer");
      await browser.process()?.kill();
    }

    return finalResults;
  } catch (err) {
    console.log("program exited with err => " + err);
    process.exit();
  }
}

export { run };
