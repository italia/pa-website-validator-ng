"use strict";
import puppeteer, { Browser } from "puppeteer";
import process from "process";
import * as dotenv from "dotenv";
dotenv.config();

let oldBrowser: Browser | null = null;

async function initializePuppeteerOld() {
  if (!oldBrowser) {
    console.error("Initializing Puppeteer Old Instance..");

    oldBrowser = await puppeteer
      .launch({
        headless: true,
        args: [
          "--no-zygote",
          "--no-sandbox",
          "--accept-lang=it",
          "--disable-setuid-sandbox",
          "--enable-logging",
          "--v=1",
        ],
        executablePath: process.env?.OLD_PUPPETEER_BROWSER_PATH ?? "",
      })
      .catch((err) => {
        console.error("Failed to launch Puppeteer old version:", err);
        return null;
      });
  }

  return oldBrowser;
}

export { initializePuppeteerOld };
