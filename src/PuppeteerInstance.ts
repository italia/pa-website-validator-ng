'use strict';
import puppeteer from 'puppeteer';

let browser: any | null = null;

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

    browser.on('targetcreated', async (target : any) => {
      if (target.type() === 'page') {
        const page = await target.page();

        page.setDefaultTimeout(300000);
      }
    });
  }
}

export { browser, initializePuppeteer }
