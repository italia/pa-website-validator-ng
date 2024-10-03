'use strict';
import puppeteer from 'puppeteer';

let browser: any | null = null;

await initializePuppeteer();

async function initializePuppeteer(): Promise<void> {

  if (!browser) {
    console.error('Initializing Puppeteer Instance..');

    let browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ["--no-zygote", "--no-sandbox", "--accept-lang=it"],
    }).catch((err) => {
      console.error('Failed to launch Puppeteer:', err);
      throw err;
    });

    const browserWSEndpoint = browserInstance.wsEndpoint();

    browser = await puppeteer.connect({ browserWSEndpoint });
  }
}

export { browser, initializePuppeteer }
