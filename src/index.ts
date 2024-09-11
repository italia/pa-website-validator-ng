"use strict";
import ScanManager from "./trash/ScanManager.js"
import { browser } from './PuppeteerInstance.js' //puppeteer browser being reused
import PageManager from "./PageManager.js"       //array of pages to be analyzed
import scan from "./Scan.js";

async function run() {
    try {
      //const url = 'https://www.alberghierosonzogni.it/';
      const url = 'https://www.alberghierosonzogni.it/';
      const type = 'school';

      const scanManager = new ScanManager(4, type);

      //register method to the event 'page-added'
      PageManager.onPagesAdded((pageData) => {
        scan(pageData)
      });

      //add homepage to pages array => trigger scan flow
      // await PageManager.addPage({
      //   id: 'service',
      //   url: "https://www.comune.borgaro-torinese.to.it/servizio/bonus-sociali-elettricita-gas-acqua/",
      //   type: 'service',
      //   redirectUrl: '',
      //   internal: true,
      //   scanned: false,
      //   audited: false
      // })


      await PageManager.addPage({
        id: 'homepage',
        url: "https://www.comune.borgaro-torinese.to.it/servizio/bonus-sociali-elettricita-gas-acqua/",
        type: 'homepage',
        redirectUrl: '',
        internal: true,
        scanned: false,
        audited: false
      })

    } catch (err) {
      await browser.close()
      console.log('program exited with err => ' + err)
      process.exit()
    }
  }
  
run();
