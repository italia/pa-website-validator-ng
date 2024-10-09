//const EventEmitter = require('events');
import PageManager from "../PageManager.js"
import { Worker, isMainThread, parentPort, threadId } from 'worker_threads';
import crawlerTypes from "../types/crawler-types.js";
import PageData = crawlerTypes.PageData
import {config} from "../config/config.js";
import scan from "../Scan.js";

interface Scan {
    id: number;
    active: boolean
}

interface Audit {
    id: string
    completed: boolean
    numberOfPages: number
    results: any[]
}

class ScanManager {
    protected scans: Scan[]
    protected audits: Audit[]
    private scanNumber = 4
    private type = ''

    constructor(scanNumber: number, type: string) {
        this.scans = [];
        this.audits = []
        this.scanNumber = scanNumber
        this.type = type
    }

    async scan(pageData: PageData) {
        console.log(pageData.type)

        /** if no gathering or auditing for this page type skip*/
        if (!(config[this.type][pageData.type].gatherers.length > 0) &&
            !(config[this.type][pageData.type].audits.length > 0 )
        ) {
            return;
        }

        const gatherers = config[this.type][pageData.type].gatherers
        const audits = config[this.type][pageData.type].audits

        /** filter out audits if they've been completed - add them to audits array*/
        let toDoAudits:string[] = []
        for (let auditId of audits){
            if (!this.audits.find(el=> el.id === auditId)) {
                this.audits.push({
                    id:auditId,
                    numberOfPages:10,
                    results: [],
                    completed:false
                })

                console.log(auditId)
                toDoAudits.push(auditId)
            } else if (this.audits.find(el=> el.id === auditId && !el.completed)){
                
                toDoAudits.push(auditId)
            }
        }

        console.log(toDoAudits)
        const worker = new Worker('./dist/ScanWorker.js');

        this.scans.push({ id: worker.threadId, active: true });
        worker.on('message', this.handleMessage.bind(this));

        worker.on('error', (err: Error) => {
            console.error('Worker error:', err);
        });

        worker.on('exit', (code: number) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
        });

        worker.postMessage({ 
            type: 'scan', 
            pageData,
            gatherers,
            audits: toDoAudits
        });

        await this.waitForCompletion(worker)  
    }

    private async waitForCompletion(worker: Worker): Promise<void> {
        return new Promise((resolve) => {
            worker.on('message', () => {
                resolve();
            });
        });
    }

    handleMessage = (message: any) => {
        if (message.type == 'add-page') {
            PageManager.addPage(message.page)
            console.log(`SCAN ${message.threadId} => ADD page ${message.page.url} to array`)
        }

        if (message.type == 'result') {
            console.log('SCAN MANAGER => threads '+ this.scans.length)
            console.log('PAGE ARRAY HAS: ' + PageManager.getAllPages().length)
            console.log('PAGE : ' , PageManager.getAllPages())
            console.log(`SCAN ${message.threadId} => DONE`)
            
            const scan = this.scans.find(el=>el.id == message.threadId)
            if (scan) scan.active = false
            this.scans = this.scans.filter(el => el.id != message.threadId)

            if (this.scans.length == 0) {
                this.sumUp()
            } 

            const page = PageManager.getAllPages().pop()
            if (page) {
                this.scan(page)
            }
        }
    }

    async sumUp() {
        console.log('SITE CRAWLED')
    }
}

export default ScanManager;
