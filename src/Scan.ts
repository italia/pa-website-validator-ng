import PageManager from './PageManager.js';
import { browser } from './PuppeteerInstance.js';
import { gatherers } from './GathererManager.js';
import crawlerTypes from "./types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {config} from "./config/config.js";

const scan = async (pageData: PageData) => {
    try {
        /** if no gathering or auditing for this page type skip*/

        console.log(pageData)
        if (!config.gatherers[pageData.type]){
            PageManager.setAudited(pageData.url)
            if (!PageManager.hasRemainingPages()) {
                console.error('closing puppeteer')
                await browser.close()
                console.log('SCAN ENDED - navigated pages:')
                console.log( PageManager.getAllPages())
           
            }
            return
        }

        if (config.gatherers[pageData.type] && !(config.gatherers[pageData.type].length > 0) 
            //&& config.audits[pageData.type] && !(config.audits[pageData.type].length > 0 )
        ) {
            PageManager.setAudited(pageData.url)
            console.log(PageManager.hasRemainingPages())
    
            if (!PageManager.hasRemainingPages()) {
                console.error('closing puppeteer')
                console.log(await browser.close())
                'SCAN ENDED - navigated pages are:'
                console.log( PageManager.getAllPages())
            }
            console.log('scan ended')
            return;
        }

        console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering start`)

        /** GATHERING */
        let gathererPages: any = []
        let gatheringErrors = []

        //console.log(config[pageData.type].gatherers)
        for (let gathererId of config.gatherers[pageData.type]) {
            try {
                console.log(gathererId,gatherers[gathererId])
                if (!gatherers[gathererId]) continue

                //console.log(gathererId)
                const gatherer = await gatherers[gathererId]()
               
                if (gatherer === undefined) throw new Error(` No gatherer found for id ${gathererId}: check your configuration` )
    
                const fetchedPages = await gatherer.navigateAndFetchPages(pageData.url, 5)
                gathererPages = [...gathererPages,...fetchedPages]
            } catch(e:any) {
                console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`)
                console.log(e.message)
                gatheringErrors.push(e)
            }
        }
        PageManager.setErrors(pageData.url,gatheringErrors )

        gathererPages.forEach((page: PageData) => {
            PageManager.addPage(page)
        });

    
        /** AUDITING */
        // for (let i = 0; i < 6; i++) {
        //     console.log(`SCAN \x1b[32m ${pageData.type}\x1b[0m ${pageData.url} Auditing: C.SC.1.${i} on page ${pageData.url}`);

        //     await new Promise((resolve) => {
        //         setTimeout(() => {
        //             console.log(`SCAN \x1b[32m ${pageData.type}\x1b[0m ${pageData.url} Auditing: C.SC.1.${i}  on page ${pageData.url} \x1b[32m DONE\x1b[0m `);
        //             resolve('')
        //         }, Math.random() * 2000);
        //     });
        // }

        PageManager.setAudited(pageData.url)
    
        if (!PageManager.hasRemainingPages()) {
            console.error('closing puppeteer...')
            await browser.close()
            PageManager.getAllPages()
            console.log('SCAN ENDED - navigated pages:' )
            console.log(PageManager.getAllPages())
        }
        //sconsole.log('scan ended')

    } catch (err) {
        console.log(`SCAN error: ${err}`)
        await browser.close()
    }
}


export default scan

