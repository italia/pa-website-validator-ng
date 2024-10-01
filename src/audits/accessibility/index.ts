"use strict";

import { CheerioAPI } from "cheerio";


import { getAllPageHTML, urlExists } from "../../utils/utils.js";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";

class A11yAudit extends Audit {
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
            scoreDisplayMode: this.SCORING_MODES.BINARY,
            requiredArtifacts: ["origin"],
        };
    }

    async auditPage(
        page: Page | null,
        error?: string,
    ) {

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
                    key: "page_contains_correct_url",
                    itemType: "text",
                    text: "La pagina contiene l'url del sito di origine",
                },
                {
                    key: "wcag",
                    itemType: "text",
                    text: "È dichiarata la conformità alle specifiche WCAG 2.1",
                },
            ];

            const items = [
                {
                    result: (this.constructor as typeof Audit).auditData.redResult,
                    link_name: "",
                    link_destination: "",
                    existing_page: "No",
                    page_contains_correct_url: "",
                    wcag: "",
                },
            ];

            let data = await page.content();
            let $: CheerioAPI = await cheerio.load(data);

            const accessibilityDeclarationElement = $("footer").find(
                '[data-element="accessibility-link"]'
            );
            const elementObj = $(accessibilityDeclarationElement).attr();
            items[0].link_name = accessibilityDeclarationElement.text().trim() ?? "";
            items[0].link_destination = elementObj?.href ?? "";

            if (
                elementObj &&
                "href" in elementObj &&
                elementObj.href !== "#" &&
                elementObj.href !== ""
            ) {
                const href = elementObj.href;
                const checkUrl = await urlExists(url, href);

                if (checkUrl.exception)
                    throw new Error("Possibile errore del server AGID, verificare.");

                if (!checkUrl.result) {
                    this.globalResults.score = 0;
                    this.globalResults.details.items = items;
                    this.globalResults.details.headings = this.headings;

                    return {
                        score: 0,
                    }
                }

                items[0].existing_page = "Sì";
                items[0].page_contains_correct_url = "No";
                items[0].wcag = "No";

                if (!href.includes("https://form.agid.gov.it/view/")) {
                    this.globalResults.score = 0;
                    this.globalResults.details.items = items;
                    this.globalResults.details.headings = this.headings;

                    return {
                        score: 0,
                    };
                }

                const domain = new URL(url).host.replace(/^www./, "");

                const privacyPageHTML: string = await getAllPageHTML(href); //TODO: questa funzione utilizza una nuova instanza di puppeteer, secondo me dovremmo creare un altro gatherer per questa tipologia di pagina
                if (!privacyPageHTML.match(new RegExp(domain, "i"))) {

                    this.globalResults.score = 0;
                    this.globalResults.details.items = items;
                    this.globalResults.details.headings = this.headings;

                    return {
                        score: 0,
                    };
                }

                items[0].page_contains_correct_url = "Sì";

                if (
                    !privacyPageHTML.match(/wcag 2.1/i) &&
                    !privacyPageHTML.match(/wcag-21/i)
                ) {
                    this.globalResults.score = 0;
                    this.globalResults.details.items = items;
                    this.globalResults.details.headings = this.headings;

                    return {
                        score: 0,
                    };
                } else {
                    items[0].wcag = "Sì";
                }

                items[0].result = (this.constructor as typeof Audit).auditData.greenResult;
            }

            console.log('passo');

            this.globalResults.score = 1;
            this.globalResults.details.items = items;
            this.globalResults.details.headings = this.headings;

            return {
                score: 1,
            };
        }
    }

    async getType(){
        return (this.constructor as typeof Audit).auditId;
    }

    async returnGlobal(){
        return this.globalResults;
    }

    static getInstance(): Promise<A11yAudit> {
        if (!A11yAudit.instance) {
            A11yAudit.instance = new A11yAudit('',[],[]);
        }
        return A11yAudit.instance;
    }

}

export {A11yAudit};
export default A11yAudit.getInstance;

