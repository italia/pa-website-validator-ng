import PageManager from './PageManager.js';
import {browser} from './PuppeteerInstance.js';

import {gatherers} from './GathererManager.js';
import {audits} from './AuditManager.js';

import crawlerTypes from "./types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {config} from "./config/config.js";
import {loadPage} from "./utils/utils.js";
import {Page} from "puppeteer";

const scan = async (pageData: PageData) => {
    try {
        /** if no gathering or auditing for this page type skip*/

        console.log(PageManager.getAllPages());

        //console.log(pageData)
        if (!config.gatherers[pageData.type] && !config.audits[pageData.type]) {
            PageManager.setGathered(pageData.url)
            PageManager.setAudited(pageData.url)

            if (!PageManager.hasRemainingPages()) {
                console.error('closing puppeteer')
                await browser.close()
                console.log('SCAN ENDED - navigated pages:')
                console.log(PageManager.getAllPages())

            }
            return
        }else if(!config.audits[pageData.type]){
            PageManager.setAudited(pageData.url);
            pageData = PageManager.getPageByUrl(pageData.url);
        }else if(!config.gatherers[pageData.type]){
            PageManager.setGathered(pageData.url);
            pageData = PageManager.getPageByUrl(pageData.url);
        }

        console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering start`)

        /** GATHERING */
        let gathererPages: any = []
        let gatheringErrors = []


        if(!pageData.gathered){
            for (let gathererId of config.gatherers[pageData.type]) {
                const page : Page = await loadPage(pageData.url);
                await page.waitForNetworkIdle();
                if (!gatherers[gathererId]) continue

                //console.log(gathererId)
                const gatherer = await gatherers[gathererId]()
                try {
                    //console.log(gathererId,gatherers[gathererId])

                    if (gatherer === undefined) throw new Error(` No gatherer found for id ${gathererId}: check your configuration`)

                    const accuracy = process.env["accuracy"] ?? "suggested";
                    const configAccuracy = config.accuracy[accuracy];

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
                        temporary: true,
                    })
                    gatheringErrors.push(e)
                }
            }

            pageData = await PageManager.setErrors(pageData.url, gatheringErrors, true)
            gathererPages.forEach((page: PageData) => {
                PageManager.addPage(page)
            });


            await PageManager.setGathered(pageData.url);
            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering end`);
        }

        /** AUDITING */
        let auditedPages: any = []
        let auditingErrors = []

        if(!pageData.audited || (pageData.audited && pageData.temporary)){

            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Audit start`);

            if(config.audits[pageData.type]){
                for (let auditId of config.audits[pageData.type]) {
                    if (!audits[auditId]) continue
                    const audit = await audits[auditId]()
                    try {

                        let page : Page | null = null;
                        if(!pageData.temporary) {
                            page = await loadPage(pageData.url);
                        }

                        if (audit === undefined) throw new Error(` No audit found for id ${auditId}: check your configuration`);

                        await audit.auditPage(page, pageData.errors && pageData.errors.length ? pageData.errors[0] : '');
                        const result = await audit.returnGlobal();
                        await PageManager.setGlobalResults({result: result, auditType: await audit.getType()});

                    } catch (e: any) {
                        console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`)
                        console.log(e.message)

                        auditingErrors.push(e)
                    }
                }
            }

            PageManager.setNotTemporary(pageData.url, pageData.type);
            PageManager.setErrors(pageData.url, auditingErrors)
            PageManager.setAudited(pageData.url);
            console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Auditing end`);
        }

        if (!PageManager.hasRemainingPages()) {
            console.error('closing puppeteer...')
            await browser.close()
            PageManager.getAllPages();
            PageManager.getGlobalResults();
            console.log('SCAN ENDED - navigated pages:')
            console.log(PageManager.getAllPages(), JSON.stringify(await PageManager.getGlobalResults()));

    } catch (err) {
        console.log(`SCAN error: ${err}`)
        await browser.close()
    }
}


export default scan

