
import {Audit} from "../Audit.js";

import lighthouse from 'lighthouse';
import {Page} from "puppeteer";
import {browser} from "../../PuppeteerInstance.js";
import municipalityOnlineConfig from "../../config/lighthouse-municipality-config-online.js";


const auditId = "lighthouse";

class lighthouseAudit extends Audit {

    public globalResults: any = {
        score: 1,
        details: {
            items: [],
            type: 'table',
            headings: [],
            summary: ''
        },
        errorMessage: ''
    };

    async auditPage(page: Page | null) {
        if(page){
            const browserWSEndpoint = browser.wsEndpoint();
            const { port } = new URL(browserWSEndpoint);

            const options = {
                logLevel: process.env["logsLevel"],
                output: 'json',
                port: port,
                municipalityOnlineConfig
            };

            const url = page.url();
            const results =  await this.runLighthouse(url, options);

            this.globalResults.details.items = results;

            return;
        }

        return;

    }

    async meta(){
        return {}
    }

    async returnGlobal(){
        return this.globalResults;
    }

    async runLighthouse(url: string, options: any): Promise<any> {
        try {
          const runnerResult = await lighthouse(url, options);
          return JSON.parse(<string>runnerResult?.report).audits ?? {};
        } catch (error) {
          console.error('Error running Lighthouse:', error);
          throw error;
        }
      }

    async getType(){
        return auditId;
    }
      
     
static getInstance(): Promise<lighthouseAudit> {
  if (!lighthouseAudit.instance) {
    lighthouseAudit.instance = new lighthouseAudit('',[],[]);
  }
  return lighthouseAudit.instance;
}
}

export { lighthouseAudit };
export default lighthouseAudit.getInstance;