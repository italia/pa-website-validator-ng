import {audits} from '../AuditManager.js';
import * as ejs from 'ejs';
import { promises as fs } from 'fs';
import { mkdir, writeFile } from "fs/promises";
import open from "open";
import { format } from "path";
import { VERSION } from '../version.js';
import {Audit} from '../audits/Audit.js';
import PageManager from '../PageManager.js';

const render = async () => {
    const website = process.env.website
    const destination = process.env.destination
    const saveFile = process.env.saveFile
    const view = process.env.view
    const reportName = process.env.reportName
    const date = formatDate(new Date())

    let successAudits = []
    let failedAudits = []
    //let informativeAudits = []
    let lighthouseIFrame = null


    /** get data from report instances */
    for(let auditId of Object.keys(audits)){
        const audit = await audits[auditId]() as any

        const auditMeta = await audit.meta()
        const auditResult = audit.globalResults as any
        const score = auditResult.score 

        if (score > 0.5) {
            successAudits.push({
                ...auditMeta,
                status: 'pass',
                auditHTML : await audit.returnGlobalHTML()
        })
        } else if (score === 0.5) {
            successAudits.push({
                ...auditMeta,
                status: 'average',
                auditHTML : await audit.returnGlobalHTML()
            })
        } else {
            failedAudits.push({
                ...auditMeta,
                status: 'fail',
                auditHTML : await audit.returnGlobalHTML()
        })
        }

        // if (auditId == "school_accessibility" )
        //     informativeAudits.push({
        //         ...auditMeta,
        //         auditHTML : await audit.returnGlobalHTML()
        // })

        /** LIGHTHOUSE AUDIT specific flow */
        if (auditId === 'lighthouse') {
            lighthouseIFrame = audit.reportHTML
        }
    
    }

    //console.log(failedAudits)
    // console.log('PASSED', successAudits)
    // console.log('FAILED', successAudits)
    // console.log('INFO', informativeAudits)

    const reportJSON = await PageManager.getGlobalResults()

    let status = 'ko'
    if (successAudits.length > failedAudits.length) {
        status = 'ok'
    }

    const reportHtml = await ejs.renderFile('src/report/index.ejs', {
         crawler_version: VERSION,
         date: date,
         results: {
            status: status,
            passed_audits: successAudits.length,
            failed_audits : failedAudits.length,
            total_audits:  Object.keys(audits).length,
         },
         audits: {
            passed: successAudits,
            info: [], //informativeAudits,
            failed: failedAudits
         },
         url_comune: website,
         lighthouseIFrame: lighthouseIFrame.replace(/"/g, '&quot;')
    });   

    if (saveFile == "false") {
        return {
            status: true,
            data: {
            htmlReport: reportHtml,
            jsonReport: reportJSON,
            },
        };
    }

    await mkdir(destination as string, { recursive: true });

    const htmlPath = format({
        dir: destination,
        name: reportName,
        ext: ".html",
    });

    const jsonPath = format({
        dir: destination,
        name: reportName,
        ext: ".json",
    });

    await writeFile(htmlPath, reportHtml);
    await writeFile(jsonPath, JSON.stringify(reportJSON));

    if (view == "true") {
        await open(htmlPath);
    }
  
    //   return {
    //     status: true,
    //     data: {
    //       htmlResultPath: htmlPath,
    //       jsonResultPath: jsonPath,
    //     },
    //   };

}

const  formatDate = (date: Date): string =>{
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year.slice(-2)} ${hours}:${minutes}`;
}


export default render