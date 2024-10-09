'use strict';
import puppeteer from 'puppeteer';
import process from "process";

let browser: any | null = null;
let oldBrowser : any | null = null;

await initializePuppeteer();

async function initializePuppeteer(): Promise<void> {

  if (!browser) {
    console.error('Initializing Puppeteer Instance..');

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-zygote", "--no-sandbox", "--accept-lang=it"],
    }).catch((err) => {
      console.error('Failed to launch Puppeteer:', err);
      throw err;
    });

    oldBrowser = await puppeteer.launch({
      headless: true,
      executablePath: process.env?.OLD_PUPPETEER_BROWSER_PATH ?? ''
    }).catch((err) => {
      console.error('Failed to launch Puppeteer old version:', err);
      throw err;
    });

    browser.on('targetcreated', async (target : any) => {
      if (target.type() === 'page') {
        const page = await target.page();

        page.setDefaultTimeout(300000);
      }
    });

    oldBrowser.on('targetcreated', async (target : any) => {
      if (target.type() === 'page') {
        const page = await target.page();

        page.setDefaultTimeout(300000);
      }
    });
  }
}

export { browser, oldBrowser, initializePuppeteer }
