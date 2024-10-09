
import { Audit } from "../Audit.js";

import lighthouse from 'lighthouse';
import { Page } from "puppeteer";
import { browser } from "../../PuppeteerInstance.js";
import * as ejs from 'ejs'

class lighthouseAudit extends Audit {

    auditId = "lighthouse";
    code = 'C.SI.4.1'
    mainTitle = 'LIGHTHOUSE'
    mainDescription = 'Velocità e tempi di risposta'
    minRequirement = "il sito presenta livelli di prestazioni (media pesata di 6 metriche standard) pari o superiori a 50. Se il punteggio è inferiore a 50, il Comune deve pubblicare sul sito un “Piano di miglioramento del sito” raggiungibile dal footer che mostri, per ciascuna voce che impatta negativamente le prestazioni, le azioni future di miglioramento e le relative tempistiche di realizzazione attese"
    automaticChecks = ''  
    failures = ""
    metricsResult = {}
    displayMetrics = [
        "first-contentful-paint",
        //"interactive",
        "speed-index",
        "total-blocking-time",
        "largest-contentful-paint",
        "cumulative-layout-shift"
    ]

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
  
            const metrics = runnerResult.lhr.audits.metrics
            const lhrAudits = runnerResult.lhr.audits
            const metricsScore = metrics.score
            const metricsDetails = metrics.details
            const performanceScore = runnerResult.lhr.categories.performance.score
            const items =  metricsDetails.items[0]
            
            let metricsResult = []


            // "interactive": {
            //     "id": "interactive",
            //     "title": "Time to Interactive",
            //     "description": "La metrica Tempo all'interattività indica il tempo necessario affinché la pagina diventi completamente interattiva. [Ulteriori informazioni](https://web.dev/interactive/).",
            //     "score": 0.98,
            //     "scoreDisplayMode": "numeric",
            //     "numericValue": 2575.035,
            //     "numericUnit": "millisecond",
            //     "displayValue": "2,6 s"
            //   },

            for (let metricId of this.displayMetrics) {
                if (Object.keys(lhrAudits).includes(metricId)) {
                    const metric = lhrAudits[metricId]

                    let score =  metric.score * 100
                    let status = "fail"
                    if ( score >= 90 ) {
                        status = 'pass'
                    } else if ( score > 49 && score < 90) {
                        status = 'average'
                    }

                    metricsResult.push({
                        "status": status,
                        "title": metric.title,
                        "result": metric.displayValue,
                        "description": metric.description 
                    })
                }
            }


            //console.log(JSON.stringify(runnerResult.lhr.audits.metrics))
            this.globalResults.score = performanceScore
            this.metricsResult = metricsResult
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
        return this.auditId;
    }


    async returnGlobalHTML() {
        let status = 'fail'
        let message = ''

        if (this.globalResults.score > 0.5) {
            status = 'pass',
            message = this.auditData.greenResult
        } else if (this.globalResults.score = 0.5) {
            status = 'average',
            message = this.auditData.yellowResult
        } else {
            status = 'fail',
            message = this.auditData.redResult
        }
  
        const reportHtml = await ejs.renderFile('src/report/partials/audit/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults.details, status, statusMessage: message , metrics: this.metricsResult,  totalPercentage : this.globalResults.score});   
        return reportHtml
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