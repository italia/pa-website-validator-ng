"use strict";
import ScanManager from "./trash/ScanManager.js"
import { browser } from './PuppeteerInstance.js' //puppeteer browser being reused
import PageManager from "./PageManager.js"       //array of pages to be analyzed
import scan from "./Scan.js";
import {gatherers} from "./GathererManager.js"
import { initializeConfig } from "./config/config.js";
// import crawlerTypes from "./types/crawler-types.js";
// import siteType = crawlerTypes.siteType

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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
  .option("website", {
    describe: "Website where to run the crawler",
    type: "string",
    demandOption: true,
  })
  .option("page-type", {
    describe:
      "Type of the page passed as 'website' argument. Usefull as debug mode",
    type: "string",
    demandOption: false,
    default: "homepage",
   })
  .option("timeout", {
    describe:
      "Request timeout in milliseconds. If the request takes longer than this value, the request will be aborted",
    type: "number",
    demandOption: false,
    default: 30000,
   });

try {
  const args = await parser.argv;

  const result = await run(
    args.type,
    args.website,
    args['page-type']
  )

} catch (e) {
  console.error(e);
  process.exit(1);
}

async function run(type: string, website: string, page_type:string) {
    try {
      initializeConfig(type)

      //register method to the event 'page-added'
      PageManager.onPagesAdded((pageData) => {
        scan(pageData)
      });

      await PageManager.addPage({
        id: 'homepage',
        url: website,
        type: page_type ?? 'homepage',
        redirectUrl: '',
        internal: true,
        audited: false
      })

    } catch (err) {
      await browser.close()
      console.log('program exited with err => ' + err)
      process.exit()
    }
  }
  

