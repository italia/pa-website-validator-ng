import {audits} from '../AuditManager.js';
import * as ejs from 'ejs';
import { promises as fs } from 'fs';
import { mkdir, writeFile } from "fs/promises";
import open from "open";
import { format } from "path";
import { VERSION } from '../version.js';
import {Audit} from '../audits/Audit.js';

const render = async () => {
    const website = process.env.website
    const destination = process.env.destination
    const saveFile = process.env.saveFile
    const view = process.env.view
    const reportName = process.env.reportName

    const  formatDate = (date: Date): string =>{
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}/${month}/${year.slice(-2)} ${hours}:${minutes}`;
    }
    const reportDate = formatDate(new Date())

    /** collect data for report tabs */
    let successAudits = []
    let failedAudits = []
    let informativeAudits = []
    let lighthouseIFrame = null

    for(let auditId of Object.keys(audits)){
        const audit = await audits[auditId]() as any

        const auditMeta = await audit.meta()
        const auditResult = audit.globalResults as any
        const score = auditResult.score 

        if (score >= 0.5) {
            successAudits.push(
                {id: 'ID', code: 'C34', title: 'critero', status: 'pass' }
            )
        } else {
            failedAudits.push( {id: 'ID', code: 'C34', title: 'critero', status: 'pass' })
        }

        if (auditId == "school_accessibility" )
            informativeAudits.push({
                ...auditMeta,
                auditHTML : await audit.returnGlobalHTML()
        })


    }


    console.log('PASSED', successAudits)
    console.log('FAILED', successAudits)
    console.log('INFO', informativeAudits)

    const reportJSON = ""
    const reportHtml = await ejs.renderFile('src/report/index.ejs', {
         version: VERSION,
         reportDate: reportDate,
         results: {
            passed_audits: 1,
            failed_audits : 19,
            total_audits: 20,
         },
         audits: {
            passed: successAudits,
            info: informativeAudits,
            failed: failedAudits
         },
         website: website
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
    await writeFile(jsonPath, reportJSON);

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

export default render