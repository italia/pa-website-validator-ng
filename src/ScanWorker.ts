import { Gatherer } from './gatherers/Gatherer.js';
import { browser } from './PuppeteerInstance.js';
import { firstLevelPagesGatherer } from './gatherers/first_level_pages/first_level_pages.js';
import { secondLevelPagesGatherer } from './gatherers/second_level_pages/second_level_pages.js'
import { Worker, isMainThread, parentPort, threadId } from 'worker_threads';
import crawlerTypes from "./types/crawler-types";
import PageData = crawlerTypes.PageData

interface InputMessage {
    type: string;
    pageData: PageData;
    gatherers: string[];
    audits: string[];
}

async function scan(pageData: PageData, gatherers: string[], audits: string[]) {

    try {
        console.log(`SCAN ${threadId} start for page TYPE ${pageData.type}`)

        /** GATHERING */
        let gathererPages: any = []

        console.log(audits)
        for (let gathererId of gatherers) {
            let gatherer: any
            switch (gathererId) {
                case 'homepage':
                    gatherer = new firstLevelPagesGatherer('', [], [])
                    break;

                case 'first-level-pages':
                    gatherer = new secondLevelPagesGatherer('', [], [])
                    break;
            }

            if (gatherer === undefined) return

            const fetchedPages = await gatherer.navigateAndFetchPages(pageData.url, [], pageData.id)
            gathererPages = [...fetchedPages]
        }

        gathererPages.forEach((page: any) => {
            parentPort?.postMessage({ type: 'add-page', threadId, page })
        });

        /** AUDITING */
        for (let i = 0; i < 6; i++) {
            console.log(`SCAN ${threadId} : Starting audit ${i} on page ${pageData.url}`);

            await new Promise((resolve) => {
                setTimeout(() => {
                    console.log(`SCAN ${threadId} : AUDIT ${i} on page ${pageData.url}`);
                    resolve('')
                }, Math.random() * 2000);
            });
        }

        await browser.close()

        parentPort?.postMessage({ type: 'result', threadId, pageUrl: pageData.url });
        process.exit()

    } catch (err) {
        parentPort?.postMessage({ type: 'error', threadId, pageId: pageData.id });
        console.log(`SCAN ${threadId} error: ${err}`)
        await browser.close()
    }
}

async function handleMessage(message: InputMessage) {
    if (message.type === 'scan') {
        scan(message.pageData, message.gatherers, message.audits)
    }

    if (message.type == 'terminate') {
        process.exit()
    }
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

parentPort?.on('message', handleMessage);


