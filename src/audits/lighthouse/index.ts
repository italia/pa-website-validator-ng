
import crawlerTypes from "../..//types/crawler-types";
import {Audit} from "../Audit.js";
import PageData = crawlerTypes.PageData

import lighthouse from 'lighthouse';

class lighthouseAudit extends Audit {

    async auditPage(page:PageData) {
        const runnerResult = await this.runLighthouse(page.url, {});
        console.log(runnerResult)
        //return runnerResult.report;

        return runnerResult;
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