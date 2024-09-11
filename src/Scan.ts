import PageManager from './PageManager.js';
import { browser } from './PuppeteerInstance.js';
import { firstLevelPagesGatherer } from './gatherers/first_level_pages/first_level_pages.js';
import { secondLevelPagesGatherer } from './gatherers/second_level_pages/second_level_pages.js'
import {bookingAppointmentGatherer} from './gatherers/booking_appointment/booking_appointment.js'
import {servicesPageGatherer} from './gatherers/services_page/services_page.js'
import crawlerTypes from "./types/crawler-types.js";
import PageData = crawlerTypes.PageData
import config from "./config/config.js";

const scan = async (pageData: PageData) => {
    try {
        //console.log(PageManager.getAllPages())
        const siteType = 'school'

        /** if no gathering or auditing for this page type skip*/
        console.log(PageManager.getAllPages())
        if (!(config[siteType][pageData.type].gatherers.length > 0) &&
            !(config[siteType][pageData.type].audits.length > 0 )
        ) {
            return;
        }

        console.log(` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering start`)

        /** GATHERING */
        let gathererPages: any = []

        console.log(config[siteType][pageData.type].gatherers)
        for (let gathererId of config[siteType][pageData.type].gatherers) {
            let gatherer: any
            switch (gathererId) {
                case 'first-level-pages':
                    gatherer =   firstLevelPagesGatherer.getInstance()
                    break;

                case 'booking-appointment':
                    gatherer =  bookingAppointmentGatherer.getInstance()
                    break;

                case 'second-level-pages':
                    gatherer =  secondLevelPagesGatherer.getInstance()
                    break;
                case 'services-page':
                    gatherer = servicesPageGatherer.getInstance()
            }

            if (gatherer === undefined) return

            const fetchedPages = await gatherer.navigateAndFetchPages(pageData.url, 5)
            gathererPages = [...gathererPages,...fetchedPages]
        }

        // console.log('close browser')
        // await browser.close()
     

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

        PageManager.setScanned(pageData.url)
        console.log(PageManager.hasRemainingPages())

        if (!PageManager.hasRemainingPages()) {
            console.error('closing puppeteer')
            console.log(await browser.close())
            console.log('navigated pages =>', PageManager.getAllPages())
            console.log('EVERITHING DONE')
        }
        console.log('scan ended')

    } catch (err) {
        console.log(`SCAN error: ${err}`)
        await browser.close()
    }
}


export default scan

