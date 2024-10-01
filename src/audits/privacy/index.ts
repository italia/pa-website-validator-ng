"use strict";

import { CheerioAPI } from "cheerio";

import { urlExists } from "../../utils/utils.js";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";

class PrivacyAudit extends Audit {
    public globalResults: any = {
        score: 0,
        details: {
            items: [],
            type: 'table',
            headings: [],
            summary: ''
        },
        errorMessage: ''
    };

    private headings : any = [];

    static get meta() {
        return {
            id: this.auditId,
            title: this.auditData.title,
            failureTitle: this.auditData.failureTitle,
            description: this.auditData.description,
            scoreDisplayMode: this.SCORING_MODES.NUMERIC,
            requiredArtifacts: ["origin"],
        };
    }

    async auditPage(
        page: Page | null,
        error?: string,
    ) {
        //TODO: secondo me dovremmo creare un gatherer per questa tipologia di pagina e qui fare solo il controllo sulla pagina

        if(error && !page){

            this.globalResults.score = 0;
            this.globalResults.details.items.push([
                {
                    result: notExecutedErrorMessage.replace("<LIST>", error),
                },
            ]);
            this.globalResults.details.headings= [{ key: "result", itemType: "text", text: "Risultato" }];

            return {
                score: 0,
            }
        }

        if(page){
            const url = page.url();

            this.headings = [
                {
                    key: "result",
                    itemType: "text",
                    text: "Risultato",
                },
                {
                    key: "link_name",
                    itemType: "text",
                    text: "Testo del link",
                },
                {
                    key: "link_destination",
                    itemType: "url",
                    text: "Pagina di destinazione del link",
                },
                {
                    key: "existing_page",
                    itemType: "text",
                    text: "Pagina esistente",
                },
                {
                    key: "secure_page",
                    itemType: "text",
                    text: "Pagina sicura",
                },
            ];

            let score = 0;

            const items = [
                {
                    result: (this.constructor as typeof Audit).auditData.redResult,
                    link_name: "",
                    link_destination: "",
                    existing_page: "No",
                    secure_page: "No",
                },
            ];

            let data = await page.content();
            let $: CheerioAPI = await cheerio.load(data);

            const privacyPolicyElement = $("footer").find(
                '[data-element="privacy-policy-link"]'
            );
            const elementObj = $(privacyPolicyElement).attr();
            items[0].link_name = privacyPolicyElement.text().trim() ?? "";
            items[0].link_destination = elementObj?.href ?? "";

            if (
                elementObj &&
                "href" in elementObj &&
                elementObj.href !== "#" &&
                elementObj.href !== ""
            ) {
                const checkUrlHttps = await urlExists(url, elementObj.href, true);

                items[0].link_destination = checkUrlHttps.inspectedUrl;

                if (checkUrlHttps.result) {
                    items[0].result = (this.constructor as typeof Audit).auditData.greenResult;
                    items[0].existing_page = "Sì";
                    items[0].secure_page = "Sì";
                    score = 1;
                }
            }

            console.log('passo');

            this.globalResults.score = score;
            this.globalResults.details.items = items;
            this.globalResults.details.headings = this.headings;

            return {
                score: score,
            };
        }
    }

    async getType(){
        return (this.constructor as typeof Audit).auditId;
    }

    async returnGlobal(){
        return this.globalResults;
    }

    static getInstance(): Promise<PrivacyAudit> {
        if (!PrivacyAudit.instance) {
            PrivacyAudit.instance = new PrivacyAudit('',[],[]);
        }
        return PrivacyAudit.instance;
    }

}

export {PrivacyAudit};
export default PrivacyAudit.getInstance;

