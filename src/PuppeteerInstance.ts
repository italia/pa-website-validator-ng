"use strict";
import puppeteer, { Browser } from "puppeteer";
import * as dotenv from "dotenv";
dotenv.config();

let browser: Browser | null | void = null;
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function initializePuppeteer() {
  if (!browser) {
    console.log("Initializing Puppeteer Instance..");

    browser = await puppeteer
      .launch({
        headless: "shell",
        args: ["--no-zygote", "--no-sandbox", "--accept-lang=it", "--v=1"],
      })
      .catch((err) => {
        console.log("Failed to launch Puppeteer:", err);
        throw err;
      });

    browser.on("targetcreated", async (target) => {
      if (target.type() === "page") {
        const page = await target.page();

        page?.setDefaultTimeout(
          parseInt(process.env["requestTimeout"] ?? "300000"),
        );
      }
    });
  }

  return browser;
}

async function getBrowser(): Promise<Browser | void | null> {
  if (!browser) {
    await initializePuppeteer();
  }

  return browser;
}

async function closeBrowsers() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export { getBrowser, initializePuppeteer, closeBrowsers, userAgent };
