
import crawlerTypes from "../types/crawler-types";
import PageData = crawlerTypes.PageData
import {Page} from "puppeteer";
import {auditDictionary} from "../storage/auditDictionary.js";
import * as ejs from 'ejs'

export abstract class Audit {
    id: string;
    gathererPageType: string[];
    auditsIds: string[];
    protected static instance: any;
    globalResults : any = {};
    code = ''

    protected auditId = "audit";
    protected auditData: crawlerTypes.AuditDictionary = auditDictionary["audit"];

    constructor(id: string, gathererPageType: string[], auditsIds: string[]) {
        this.id = id;
        this.gathererPageType = gathererPageType;
        this.auditsIds = auditsIds;
    }

    async auditPage( page: Page | null,
                     error?: string) : Promise<any> {
        return {}
    }

    async meta(){
        return {}
    }

    async addError() {

    }

    async execute(page:PageData) {

        return page;
    }

    async generateTotalResult(){

    }

    static async getType(){
        return '';
    }

    async returnGlobal(){
        return this.globalResults;
    }

    async returnGlobalHTML() {
        const status = 'pass'
        const reportHtml = await ejs.renderFile('src/report/partials/audit/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults.details, status });   
        return reportHtml
      }

    SCORING_MODES = {
        NUMERIC: 'numeric',
        BINARY: 'binary',
        MANUAL: 'manual',
        INFORMATIVE: 'informative',
        NOT_APPLICABLE: 'notApplicable',
        ERROR: 'error',
    }

}