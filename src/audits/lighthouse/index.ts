
import {Audit} from "../Audit.js";

import lighthouse from 'lighthouse';
import {Page} from "puppeteer";

class lighthouseAudit extends Audit {

    async auditPage(page: Page | null) {
        if(page){
            const url = page.url();
            const runnerResult = await this.runLighthouse(url, {});
            console.log(runnerResult)
            //return runnerResult.report;

            return runnerResult;
        }

        return;

    }

    async runLighthouse(url: string, options: any): Promise<any> {
        try {
          const runnerResult = await lighthouse(url, options);
          return runnerResult;
        } catch (error) {
          console.error('Error running Lighthouse:', error);
          throw error;
        }
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