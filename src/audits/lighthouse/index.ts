
import { Audit } from "../Audit.js";

import lighthouse from 'lighthouse';
import { Page } from "puppeteer";
import { browser } from "../../PuppeteerInstance.js";

const auditId = "lighthouse";

class lighthouseAudit extends Audit {

    code = 'C.SI.4.1'
    mainTitle = 'LIGHTHOUSE'
    mainDescription = 'Velocità e tempi di risposta'
    minRequirement = "il sito presenta livelli di prestazioni (media pesata di 6 metriche standard) pari o superiori a 50. Se il punteggio è inferiore a 50, il Comune deve pubblicare sul sito un “Piano di miglioramento del sito” raggiungibile dal footer che mostri, per ciascuna voce che impatta negativamente le prestazioni, le azioni future di miglioramento e le relative tempistiche di realizzazione attese"
    automaticChecks = ''  
    failures = ""

    reportJSON = {}
    reportHTML = ''

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
        if (page) {
            const browserWSEndpoint = browser.wsEndpoint();
            const { port } = new URL(browserWSEndpoint);

            const options = {
                logLevel: process.env["logsLevel"],
                output: ["html", "json"],
                onlyCategories: [
                    "performance",
                ],
                port: port
            };

            const url = page.url();
            const runnerResult = await this.runLighthouse(url, options);
           
            if (runnerResult.report.length < 2) {
                throw new Error("Missing JSON or HTML report");
            }

            this.reportHTML = runnerResult.report[0];
            this.reportJSON = runnerResult.report[1];

            this.globalResults.details.items = runnerResult.report.audits ?? {};

            return;
        }

        return;

    }

    async meta() {
        return {
          code: this.code,
          id: this.auditId,
          title: this.auditData.title,
          mainTitle: this.mainTitle,
          mainDescription: this.mainDescription,
          minRequirement:this.minRequirement,
          automaticChecks: this.automaticChecks,
          failures: this.failures,
          auditId: this.auditId,
          failureTitle: this.auditData.failureTitle,
          description: this.auditData.description,
          scoreDisplayMode: this.SCORING_MODES.BINARY,
          requiredArtifacts: ["origin"],
        };
      }

    async returnGlobal() {
        return this.globalResults;
    }

    async runLighthouse(url: string, options: any): Promise<any> {
        try {
            return await lighthouse(url, options);
        } catch (error) {
            console.error('Error running Lighthouse:', error);
            throw error;
        }
    }

    async getType() {
        return auditId;
    }


    static getInstance(): Promise<lighthouseAudit> {
        if (!lighthouseAudit.instance) {
            lighthouseAudit.instance = new lighthouseAudit('', [], []);
        }
        return lighthouseAudit.instance;
    }
}

export { lighthouseAudit };
export default lighthouseAudit.getInstance;