"use strict";

import { CheerioAPI } from "cheerio";

import { browser } from './../../PuppeteerInstance.js'
import {buildUrl, isInternalUrl, urlExists} from "../../utils/utils.js";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import {legalNotes} from "./legalNotes.js";
import * as cheerio from "cheerio";
import {Gatherer} from "../../gatherers/Gatherer.js";

class LicenceAudit extends Audit {

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
                    key: "page_section",
                    itemType: "text",
                    text: "Il titolo della sezione è corretto",
                },
                {
                    key: "page_contains_correct_text",
                    itemType: "text",
                    text: "La dicitura è corretta",
                },
            ];

            let score = 0;

            const items = [
                {
                    result: (this.constructor as typeof Audit).auditData.redResult,
                    link_name: "",
                    link_destination: "",
                    page_section: "",
                    page_contains_correct_text: "",
                },
            ];

            let data = await page.content();
            let $: CheerioAPI = await cheerio.load(data);

            const dataElementLegalNotes = `[data-element="${legalNotes.dataElement}"]`;
            const legalNotesElements = $("footer").find(dataElementLegalNotes);
            const elementObj = $(legalNotesElements).attr();

            if (elementObj && "href" in elementObj && elementObj["href"] !== "#") {
                let pageUrl = elementObj.href;
                if ((await isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
                    pageUrl = await buildUrl(url, pageUrl);
                }
                items[0].link_destination = pageUrl;

                const checkUrl = await urlExists(url, pageUrl);
                if (!checkUrl.result) {
                    return {
                        score: 0,
                        details: {  items: items,  type: 'table',  headings: this.headings,  summary: ''},
                    };
                }

                items[0].link_name = legalNotesElements.text().trim() ?? "";
                items[0].page_section = "No";
                items[0].page_contains_correct_text = "No";

                const legalNotesPage = await browser.newPage(); //TODO: da verificare se fatto in questo modo è corretto, secondo me dovremmo creare un gatherer dedicato a questa tipologia di pagina
                await Gatherer.gotoRetry(legalNotesPage, pageUrl, 3)

                let data = await legalNotesPage.content();
                let $: CheerioAPI = await cheerio.load(data);

                const sectionDataElement = `[data-element="${legalNotes.section.dataElement}"]`;
                const sectionElement = $(sectionDataElement);
                const sectionTitle = sectionElement?.text().trim().toLowerCase() ?? "";
                if (
                    sectionElement.length > 0 &&
                    sectionTitle === legalNotes.section.title.toLowerCase()
                ) {
                    items[0].page_section = "Sì";
                }

                const bodyDataElement = `[data-element="${legalNotes.body.dataElement}"]`;
                const bodyElements = $(bodyDataElement);
                let textBody = "";
                for (const bodyElement of bodyElements) {
                    textBody += $(bodyElement).text();
                    textBody += " ";
                }
                textBody = textBody
                    .trim()
                    .toLowerCase()
                    .replaceAll(/\s+/g, " ")
                    .replaceAll("'", "’");

                if (textBody === legalNotes.body.text.toLowerCase()) {
                    items[0].page_contains_correct_text = "Sì";
                }

                if (
                    items[0].page_section === "Sì" &&
                    items[0].page_contains_correct_text === "Sì"
                ) {
                    items[0].result = (this.constructor as typeof Audit).auditData.greenResult;
                    score = 1;
                }
            }

            this.globalResults.score = score;
            this.globalResults.details.items = items;
            this.globalResults.details.headings = this.headings;
            this.globalResults.id = (this.constructor as typeof Audit).auditId;

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

    static getInstance(): Promise<LicenceAudit> {
        if (!LicenceAudit.instance) {
            LicenceAudit.instance = new LicenceAudit('',[],[]);
        }
        return LicenceAudit.instance;
    }

}

export {LicenceAudit};
export default LicenceAudit.getInstance;

