"use strict";
import ScanManager from "./ScanManager.js"
import { browser } from './PuppeteerInstance.js'
import PageManager from "./PageManager.js"

async function run() {
    try {
      const url = 'https://www.alberghierosonzogni.it/';
      const type = 'school';

      const scanManager = new ScanManager(4, type);

      PageManager.onPagesAdded((pageData) => {
        scanManager.scan(pageData)
      });

      await PageManager.addPage({
        id: 'homepage',
        url: url,
        type: 'homepage'
      })

    } catch (err) {
      await browser.close()
      console.log('program exited with err => ' + err)
      process.exit()
    }
  }
  
run();
