
import crawlerTypes from "../types/crawler-types";
import PageData = crawlerTypes.PageData
import {Page} from "puppeteer";
import {auditDictionary} from "../storage/auditDictionary.js";

export abstract class Audit {
    id: string;
    gathererPageType: string[];
    auditsIds: string[];
    protected timeout: number = 30000;
    protected static instance: any;
    globalResults : any = {};

    static auditId = "audit";
    static auditData: crawlerTypes.AuditDictionary = auditDictionary["audit"];

    constructor(id: string, gathererPageType: string[], auditsIds: string[]) {
        this.id = id;
        this.gathererPageType = gathererPageType;
        this.auditsIds = auditsIds;
    }

    async auditPage( page: Page | null,
                     error?: string) : Promise<any> {
        return {}
    }

    async addError() {

    }

    async execute(page:PageData) {

        return page;
    }

    async generateTotalResult(){

    }

    static get SCORING_MODES() {
        return {
            NUMERIC: 'numeric',
            BINARY: 'binary',
            MANUAL: 'manual',
            INFORMATIVE: 'informative',
            NOT_APPLICABLE: 'notApplicable',
            ERROR: 'error',
        };
    }

}