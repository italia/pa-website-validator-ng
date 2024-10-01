"use strict";

import { CheerioAPI } from "cheerio";

import {checkOrder, getPageElementDataAttribute, getRedirectedUrl, missingMenuItems} from "../../utils/utils.js";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";
import {detectLang, getFirstLevelPages} from "../../utils/school/utils.js";
import {MenuItem, primaryMenuItems} from "./menuItem.js";
import {auditDictionary} from "../../storage/auditDictionary.js";

class SchoolFirstLevelMenuAudit extends Audit {

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
    static auditId = "school-menu-structure-match-model";
    static auditData = auditDictionary["school-menu-structure-match-model"];

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
                    subItemsHeading: {
                        key: "menu_voice",
                        itemType: "text",
                    },
                },
                {
                    key: "found_menu_voices",
                    itemType: "text",
                    text: "Voci del menù identificate",
                    subItemsHeading: {
                        key: "inspected_page",
                        itemType: "url",
                    },
                },
                {
                    key: "missing_menu_voices",
                    itemType: "text",
                    text: "Voci obbligatorie del menù mancanti",
                    subItemsHeading: {
                        key: "external",
                        itemType: "text",
                    },
                },
                {
                    key: "wrong_order_menu_voices",
                    itemType: "text",
                    text: "Voci del menù nell'ordine errato",
                },
            ];

            let score = 0;

            const results = [];
            results.push({
                result: (this.constructor as typeof Audit).auditData.redResult,
                found_menu_voices: "",
                missing_menu_voices: "",
                wrong_order_menu_voices: "",
            });

            let data = await page.content();
            let $: CheerioAPI = await cheerio.load(data);

            const menuDataElement = '[data-element="menu"]';
            const menuComponent = $(menuDataElement);
            if (menuComponent.length === 0) {
                return {
                    score: 0,
                    details: {  items:  [
                            {
                                result: (this.constructor as typeof Audit).auditData.nonExecuted,
                            },
                        ],  type: 'table',  headings: [{ key: "result", itemType: "text", text: "Risultato" }],  summary: ''},
                };
            }

            const foundMenuElements = await getPageElementDataAttribute(
                $,
                menuDataElement,
                "> li > a"
            );

            results[0].found_menu_voices = foundMenuElements.join(", ");

            const lang = detectLang(foundMenuElements);

            const mandatoryPrimaryMenuItems: MenuItem[] = primaryMenuItems[lang].map(
                (str) => ({
                    name: str,
                    regExp: new RegExp(`^${str}$`, "i"),
                })
            );

            const missingMandatoryElements = missingMenuItems(
                foundMenuElements,
                mandatoryPrimaryMenuItems
            );
            results[0].missing_menu_voices = missingMandatoryElements.join(", ");

            const orderResult = checkOrder(
                mandatoryPrimaryMenuItems,
                foundMenuElements
            );
            results[0].wrong_order_menu_voices =
                orderResult.elementsNotInSequence.join(", ");

            const containsMandatoryElementsResult =
                missingMandatoryElements.length === 0;
            const mandatoryElementsCorrectOrder = correctOrderMandatoryElements(
                foundMenuElements,
                mandatoryPrimaryMenuItems
            );

            if (
                foundMenuElements.length === 4 &&
                containsMandatoryElementsResult &&
                mandatoryElementsCorrectOrder
            ) {
                score = 1;
                results[0].result = (this.constructor as typeof Audit).auditData.greenResult;
            } else if (
                foundMenuElements.length > 4 &&
                foundMenuElements.length < 8 &&
                containsMandatoryElementsResult &&
                mandatoryElementsCorrectOrder
            ) {
                score = 0.5;
                results[0].result = (this.constructor as typeof Audit).auditData.yellowResult;
            }

            const firstLevelPages = await getFirstLevelPages(url); //TODO: questa funzione utilizza una nuova instanza di puppeteer

            results.push({});

            results.push({
                result: "Voce di menù",
                found_menu_voices: "Link trovato",
                missing_menu_voices: "Pagina interna al dominio",
            });

            const host = new URL(url).hostname.replace("www.", "");
            for (const page of firstLevelPages) {
                const redirectedUrl = await getRedirectedUrl(page.linkUrl);
                const pageHost = new URL(redirectedUrl).hostname.replace("www.", "");
                const isInternal = pageHost.includes(host);

                if (!isInternal) {
                    score = 0;
                }

                const item = {
                    menu_voice: page.linkName,
                    inspected_page: page.linkUrl,
                    external: isInternal ? "Sì" : "No",
                };

                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            this.globalResults.score = score;
            this.globalResults.details.items = results;
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

    static getInstance(): Promise<SchoolFirstLevelMenuAudit> {
        if (!SchoolFirstLevelMenuAudit.instance) {
            SchoolFirstLevelMenuAudit.instance = new SchoolFirstLevelMenuAudit('',[],[]);
        }
        return SchoolFirstLevelMenuAudit.instance;
    }

}

export {SchoolFirstLevelMenuAudit};
export default SchoolFirstLevelMenuAudit.getInstance;

function correctOrderMandatoryElements(
    menuElements: string[],
    mandatoryElements: MenuItem[]
): boolean {
    let result = true;

    for (let i = 0; i < mandatoryElements.length; i++) {
        if (!mandatoryElements[i].regExp.test(menuElements[i])) {
            result = false;
        }
    }

    return result;
}

