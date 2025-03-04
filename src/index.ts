"use strict";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { logLevels, run } from "./launchScript.js";

const parser = yargs(hideBin(process.argv))
  .usage(
    "Usage: --type <type> --destination <folder> --report <report_name> --website <url> --scope <scope>",
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
    demandOption: true,
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
    describe: "Number of pages to be opened in parallel",
    type: "number",
    demandOption: false,
    default: 20,
  })
  .option("auditsSubset", {
    describe: "Subset of audits to be executed",
    type: "string",
    demandOption: false,
    default: "",
  });

try {
  const args = await parser.argv;

  if (!existsSync(args.destination)) {
    console.log("[WARNING] Directory does not exist..");
    await mkdir(args.destination, { recursive: true });
    console.log("[INFO] Directory created at: " + args.destination);
  }

  const subset = args.auditsSubset ? args.auditsSubset.split(",") : undefined;

  await run(
    args.website,
    args.type,
    args.scope,
    logLevels.display_info,
    true,
    args.destination,
    args.report,
    args.view,
    args.accuracy,
    args.timeout,
    args["number-of-service-pages"],
    args.concurrentPages,
    subset,
  );

  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
