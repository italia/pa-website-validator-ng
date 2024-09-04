'use strict';
import puppeteer from 'puppeteer';

let browser: any | null = null;

await initializePuppeteer();

async function initializePuppeteer(): Promise<void> {

  if (!browser) {
    console.error('Initializing Puppeteer Instance..');

    browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 30000,
      args: ["--no-zygote", "--no-sandbox", "--accept-lang=it"],
    }).catch((err) => {
      console.error('Failed to launch Puppeteer:', err);
      throw err;
    });
  }
}

export { browser };
