import {config, initializeConfig} from "./config/config.js";
import {audits, collectAudits} from "./AuditManager.js";
import {collectGatherers} from "./GathererManager.js";
import {browser, initializePuppeteer} from "./PuppeteerInstance.js";
import PageManager from "./PageManager.js";
import scan from "./Scan.js";
import {Page} from "puppeteer";
import {loadPage} from "./utils/utils.js";
import {initializePuppeteerOld, oldBrowser} from "./PuppeteerInstanceOld.js";
import {logLevels} from "./index.js";

async function run(
    website: string,
    type: string,
    scope: string,
    logLevel: string = logLevels.display_none,
    saveFile = true,
    destination: string,
    reportName: string,
    view = false,
    accuracy = "suggested",
    requestTimeout = 30000,
    numberOfServicePages?: number,
    concurrentPages?: number,
) {
    let finalResults: any;

    try {
        await initializeConfig(type, scope);

        process.env["accuracy"] = accuracy;
        process.env["logsLevel"] = logLevel;

        if (numberOfServicePages) {
            process.env["numberOfServicePages"] =
                JSON.stringify(numberOfServicePages);
        }
        process.env["requestTimeout"] = requestTimeout.toString();

        console.log(audits);

        await collectAudits();
        await collectGatherers();
        await initializePuppeteer();

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
            await scan(pageData, saveFile, destination, reportName, view);
        });

        PageManager.onPagesClosed(async (pageData) => {
            await scan(pageData, saveFile, destination, reportName, view);
        });

        const onScriptClosedPromise = new Promise((resolve, reject) => {
            PageManager.onScriptClosed(async (results) => {
                finalResults = results;
                resolve(results);
            });
        });

        if (config.audits["homepage"].find((i: string) => i === "lighthouse")) {
            const audit = audits["lighthouse"]();
            let page: Page | null = null;
            let navigatingError;
            try {
                page = await loadPage(website);
                if (page) {
                    await page.waitForNetworkIdle();
                }
            } catch (e) {
                navigatingError = e;
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

        await initializePuppeteerOld();

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

        console.error("closing puppeteer");
        await browser.close();
        console.error("closing puppeteer old");
        await oldBrowser.close();

        return finalResults;
    } catch (err) {
        console.log("program exited with err => " + err);
        process.exit();
    }
}

export { run };