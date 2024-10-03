"use strict";

import { CheerioAPI } from "cheerio";


import {buildUrl, isInternalUrl} from "../../utils/utils.js";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";
import {compareVersions} from "compare-versions";
import axios from "axios";
import {cmsThemeRx} from "./cmsThemeRx.js";

class ThemeAudit extends Audit {
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
    static minVersion = '1.0.0';

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
                    key: "cms_name",
                    itemType: "text",
                    text: "Tema CMS del modello in uso",
                },
                {
                    key: "theme_version",
                    itemType: "text",
                    text: "Versione del tema CMS in uso",
                },
            ];

            let score = 0.5;
            const items = [
                {
                    result: (this.constructor as typeof Audit).auditData.yellowResult,
                    cms_name: "Nessuno",
                    theme_version: "N/A",
                },
            ];

            let data = await page.content();
            let $: CheerioAPI = await cheerio.load(data);

            const linkTags = $("link");
            let styleCSSUrl = "";
            for (const linkTag of linkTags) {
                if (!linkTag.attribs || !("href" in linkTag.attribs)) {
                    continue;
                }

                if (linkTag.attribs.href.includes(".css")) {
                    styleCSSUrl = linkTag.attribs.href;
                    if ((await isInternalUrl(styleCSSUrl)) && !styleCSSUrl.includes(url)) {
                        styleCSSUrl = await buildUrl(url, styleCSSUrl);
                    }

                    let CSSContent = "";
                    try {
                        const response = await axios.get(styleCSSUrl);
                        CSSContent = typeof response.data === "string" ? response.data : "";
                    } catch (e) {
                        CSSContent = "";
                    }

                    const match = CSSContent.match(cmsThemeRx);

                    if (match === null || !match.groups) {
                        continue;
                    }

                    items[0].cms_name = match.groups.name;
                    const version = match.groups.version;
                    items[0].theme_version = version;

                    score = 0;
                    items[0].result = (this.constructor as typeof Audit).auditData.redResult;

                    if (compareVersions(version, (this.constructor as typeof ThemeAudit).minVersion) >= 0) {
                        score = 1;
                        items[0].result = (this.constructor as typeof Audit).auditData.greenResult;
                    }
                    break;
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

    static getInstance(): Promise<ThemeAudit> {
        if (!ThemeAudit.instance) {
            ThemeAudit.instance = new ThemeAudit('',[],[]);
        }
        return ThemeAudit.instance;
    }

}

export {ThemeAudit};
export default ThemeAudit.getInstance;

