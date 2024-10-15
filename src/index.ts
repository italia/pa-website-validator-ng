"use strict";
import {browser, initializePuppeteer} from './PuppeteerInstance.js'
import PageManager from "./PageManager.js"
import scan from "./Scan.js";
import {audits, collectAudits} from "./AuditManager.js"
import {collectGatherers} from './GathererManager.js';

import {config, initializeConfig} from "./config/config.js";

import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {existsSync} from "fs";
import {mkdir} from "fs/promises";
import {loadPage} from "./utils/utils.js";
import {Page} from "puppeteer";
import {initializePuppeteerOld, oldBrowser} from "./PuppeteerInstanceOld.js";

export const logLevels = {
    display_none: "silent",
    display_error: "error",
    display_info: "info",
    display_verbose: "verbose",
};

const parser = yargs(hideBin(process.argv))
    .usage(
        "Usage: --type <type> --destination <folder> --report <report_name> --website <url> --scope <scope>"
    )
    .option("type", {
        describe: "Crawler to run",
        type: "string",
        demandOption: true,
        choices: ["municipality", "school"],
    })
    .option("destination", {
        describe: "Path where to save the report",
        type: "string",
        demandOption: true,
    })
    .option("report", {
        describe: "Name of the result report",
        type: "string",
        demandOption: true,
    })
    .option("website", {
        describe: "Website where to run the crawler",
        type: "string",
        demandOption: true,
    })
    .option("scope", {
        describe: "Execution scope",
        type: "string",
        demandOption: true,
        default: "online",
        choices: ["local", "online"],
    })
    .option("view", {
        describe: "View report after scan",
        type: "string",
        demandOption: false,
    })
    .option("accuracy", {
        describe:
            "Indicates the precision with which scanning is done: the greater the precision the greater the number of pages scanned",
        type: "string",
        demandOption: true,
        default: "suggested",
        choices: ["min", "suggested", "high", "all"],
    })
    .option("timeout", {
        describe:
            "Request timeout in milliseconds. If the request takes longer than this value, the request will be aborted",
        type: "number",
        demandOption: false,
        default: 300000,
    })
    .option("number-of-service-pages", {
        describe:
            "Number of service pages to analyze. It overrides the default specified with the `accuracy` option",
        type: "number",
        demandOption: false,
    })
    .option("concurrentPages", {
        describe:
            "Number of pages to be opened in parallel",
        type: "number",
        demandOption: false,
        default: 20,
    })

try {
    const args = await parser.argv;

    if (!existsSync(args.destination)) {
        console.log("[WARNING] Directory does not exist..");
        await mkdir(args.destination, {recursive: true});
        console.log("[INFO] Directory created at: " + args.destination);
    }

    const result = await run(
        args.website,
        args.type,
        args.scope,
        logLevels.display_info,
        true,
        args.destination,
        args.report,
        "view" in args,
        args.accuracy,
        args.timeout,
        args["number-of-service-pages"],
        args.concurrentPages
    );

    process.exit(0);

} catch (e) {
    console.error(e);
    process.exit(1);
}

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
    concurrentPages?: number) {

    let finalResults: any;

    try {
        await initializeConfig(type, scope);

        process.env["accuracy"] = accuracy;
        process.env["logsLevel"] = logLevel;

        if (numberOfServicePages) {
            process.env["numberOfServicePages"] = JSON.stringify(numberOfServicePages);
        }
        process.env["requestTimeout"] = requestTimeout.toString();

        console.log(audits)

        await collectAudits();
        await collectGatherers();
        await initializePuppeteer();

        process.env["accuracy"] = accuracy;
        if (numberOfServicePages) {
            process.env["numberOfServicePages"] = JSON.stringify(numberOfServicePages);
        }

        process.env["website"] = website
        process.env["requestTimeout"] = requestTimeout.toString();
        process.env["destination"] = destination
        process.env["reportName"] = reportName
        process.env["view"] = view ? String(view) : ''
        process.env["saveFile"] = saveFile ? "true" : "false"
        process.env["concurrentPages"] = concurrentPages ? concurrentPages.toString() : '20';
        process.env["type"] = type
        //register method to the event 'page-added'
        PageManager.onPagesAdded(async (pageData) => {
            await scan(pageData, saveFile, destination, reportName, view);
        });

        PageManager.onPagesClosed(async (pageData) => {
            await scan(pageData, saveFile, destination, reportName, view)
        })

        const onScriptClosedPromise = new Promise((resolve, reject) => {
            PageManager.onScriptClosed(async (results) => {
                finalResults = results;
                resolve(results);
            });
        });

        if(config.audits['homepage'].find((i : string) => i === 'lighthouse')){
            const audit = audits['lighthouse']();
            let page : Page | null = null;
            let navigatingError;
            try{
                page = await loadPage(website);
                if(page){
                    await page.waitForNetworkIdle();
                }

            }catch (e) {
                navigatingError = e;
            }

            await audit.auditPage(navigatingError ? null : page, website, navigatingError ? navigatingError : '', 'homepage');
            const result = await audit.returnGlobal();
            const meta = await audit.meta();

            if(page){
                await page.close();
            }

            await PageManager.setGlobalResults({lighthouse: {...result, ...meta} });
        }

        await initializePuppeteerOld();

        await PageManager.addPage({
            id: 'homepage',
            url: website,
            type: 'homepage',
            redirectUrl: '',
            internal: true,
            gathered: false,
            audited: false
        })

        await onScriptClosedPromise;

        console.error('closing puppeteer')
        await browser.close()
        console.error('closing puppeteer old')
        await oldBrowser.close()

        return finalResults;

    } catch (err) {
        console.log('program exited with err => ' + err)
        process.exit()
    }

}

export {run}
  

