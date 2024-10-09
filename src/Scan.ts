import PageManager from './PageManager.js';
import {browser} from './PuppeteerInstance.js';

import {gatherers} from './GathererManager.js';
import {audits} from './AuditManager.js';

import crawlerTypes from "./types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {config} from "./config/config.js";
import {loadPage} from "./utils/utils.js";
import {Page} from "puppeteer";
import {mkdir, writeFile} from "fs/promises";
import {format} from "path";
import open from "open";

const scan = async (pageData: PageData, saveFile = true, destination = '', reportName = '', view = false) => {
    try {
        await PageManager.setScanning(pageData.url, pageData.type, true);
        /** if no gathering or auditing for this page type skip*/

        if (!config.gatherers[pageData.type] && !config.audits[pageData.type]) {
            PageManager.setGathered(pageData.url, pageData.type)
            PageManager.setAudited(pageData.url, pageData.type)
            PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
            PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
            await PageManager.setScanning(pageData.url, pageData.type, false);
            await PageManager.closePage(pageData);

            if (!PageManager.hasRemainingPages()) {
                console.error('closing puppeteer')
                await browser.close()
                console.log('SCAN ENDED - navigated pages:')
            }
            return
        }
        if(!config.audits[pageData.type]){
            PageManager.setAudited(pageData.url, pageData.type);
            PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
            pageData = PageManager.getPageByUrl(pageData.url, pageData.type);
        }

        if(!config.gatherers[pageData.type]){
            PageManager.setGathered(pageData.url, pageData.type);
            PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
            pageData = PageManager.getPageByUrl(pageData.url, pageData.type);
        }

        /** GATHERING */
        let gathererPages: any = []
        let gatheringErrors = []


        if(!pageData.gathered || (pageData.gathered && pageData.temporaryGatherer)){
            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering start`)
            let navigatingError : any;

            let page : Page | null = null;
            if(!pageData.temporaryGatherer){
                try{
                    page = await loadPage(pageData.url);
                    if(page){
                        await page.waitForNetworkIdle();
                    }
                }catch (e) {
                    navigatingError = e;
                }
            }

            for (let gathererId of config.gatherers[pageData.type]) {

                if (!gatherers[gathererId]) continue

                const gatherer = await gatherers[gathererId]()
                try {
                    if (gatherer === undefined) throw new Error(` No gatherer found for id ${gathererId}: check your configuration`)

                    const accuracy = process.env["accuracy"] ?? "suggested";
                    const configAccuracy = config.accuracy[accuracy];

                    if(!page && pageData.temporaryGatherer){
                        throw new Error(pageData && pageData.errors && pageData.errors.length ? pageData.errors[0] : `Page not available for type ${pageData.type}`);
                    }

                    if(navigatingError){
                        console.log('navigating Error gatherer =', navigatingError);
                        throw new Error(navigatingError);
                    }

                    const fetchedPages = await gatherer.navigateAndFetchPages(pageData.url, configAccuracy, '', page);
                    gathererPages = [...gathererPages, ...fetchedPages]
                } catch (e: any) {
                    console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`)
                    console.log(e.message)

                    await PageManager.addPage({
                        id: '',
                        url: '/temp' + gatherer.getPageType(),
                        type: gatherer.getPageType(),
                        redirectUrl: '',
                        internal: false,
                        gathered: true,
                        audited: true,
                        errors: [e.message],
                        temporaryGatherer: true,
                        temporaryAudit: true,
                    })
                    gatheringErrors.push(e)
                }
            }

            pageData = await PageManager.setErrors(pageData.url, pageData.type, gatheringErrors, true)

            for(let gatheredPage of gathererPages){
                await PageManager.addPage(gatheredPage)
            }

            PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
            await PageManager.setGathered(pageData.url, pageData.type);
            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering end`);
            if(page){
                await page.close();
            }
        }

        /** AUDITING */
        let auditedPages: any = []
        let auditingErrors = []

        if(!pageData.audited || (pageData.audited && pageData.temporaryAudit)){
            let navigatingError : any;

            let page : Page | null = null;
            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Audit start`);
            if(!pageData.temporaryAudit){
                try{
                    page = await loadPage(pageData.url);
                    if(page){
                        await page.waitForNetworkIdle();
                    }
                    console.log('page');
                }catch (e) {
                    navigatingError = e;
                }
            }

            if(config.audits[pageData.type]){
                for (let auditId of config.audits[pageData.type]) {
                    if (!audits[auditId]) continue
                    const audit = await audits[auditId]()
                    try {

                        if (audit === undefined) throw new Error(` No audit found for id ${auditId}: check your configuration`);

                        const auditType = await audit.getType();
                        await audit.auditPage(navigatingError ? null : page, pageData.errors && pageData.errors.length ? pageData.errors[0] : navigatingError ? navigatingError : '', pageData.type);
                        const result = await audit.returnGlobal();
                        const meta = await audit.meta();

                        await PageManager.setGlobalResults({[auditType]: {...result, ...meta} });

                    } catch (e: any) {
                        console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`)
                        console.log(e.message)

                        auditingErrors.push(e)
                    }
                }

                if(page){
                    await page.close();
                }
            }

            PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
            PageManager.setErrors(pageData.url, pageData.type, auditingErrors)
            PageManager.setAudited(pageData.url, pageData.type);
            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Auditing end`);
        }

        await PageManager.setScanning(pageData.url, pageData.type, false);
        PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
        PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);


        await PageManager.closePage(pageData);

        if (!PageManager.hasRemainingPages()) {
            console.error('closing puppeteer...')
            await browser.close()
            PageManager.getAllPages();
            console.log('SCAN ENDED - navigated pages:')
            console.log(PageManager.getAllPages());

            const runnerResult : any = await PageManager.getGlobalResults();

            /*if (!runnerResult || !Object.keys(runnerResult).length) {
                throw new Error("Missing report");
            }*/

            if (!saveFile) {
                return {
                    status: true,
                    data: {
                        htmlReport: '',
                        jsonReport: runnerResult,
                    },
                };
            }

            const reportHtml: string = '';
            const reportJSON: string = JSON.stringify(runnerResult);

            await mkdir(destination, { recursive: true });

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

            if (view) {
                await open(htmlPath);
            }

            return {
                status: true,
                data: {
                    htmlResultPath: htmlPath,
                    jsonResultPath: jsonPath,
                },
            };
        }
    } catch (err) {
        console.log(`SCAN error: ${err}`)
        await browser.close()
    }
}


export default scan

