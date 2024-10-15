"use strict";
import puppeteer from "puppeteer";
import process from "process";
import * as dotenv from "dotenv";
dotenv.config();

let oldBrowser: any | null = null;

async function initializePuppeteerOld() {
  if (!oldBrowser) {
    console.error("Initializing Puppeteer Old Instance..");

    oldBrowser = await puppeteer
      .launch({
        headless: true,
        args: ["--no-zygote", "--no-sandbox", "--accept-lang=it"],
        executablePath: process.env?.OLD_PUPPETEER_BROWSER_PATH ?? "",
      })
      .catch((err) => {
        console.error("Failed to launch Puppeteer old version:", err);
        throw err;
      });
  }

  return oldBrowser;
}

export { initializePuppeteerOld };
