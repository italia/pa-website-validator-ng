
import crawlerTypes from "../types/crawler-types";
import PageData = crawlerTypes.PageData

export abstract class Audit {
    id: string;
    gathererPageType: string[];
    auditsIds: string[];
    protected timeout: number = 30000;

    constructor(id: string, gathererPageType: string[], auditsIds: string[]) {
        this.id = id;
        this.gathererPageType = gathererPageType;
        this.auditsIds = auditsIds;
    }

    async addError() {

    }

    async execute(page:PageData) {

        return page;
    }

    async generateTotalResult(){

    }

}