import {CheerioAPI, text} from 'cheerio';
import {
    checkBreadcrumb,
    checkOrder, getElementHrefValuesDataAttribute,
    getPageElementDataAttribute,
    missingMenuItems,
    toMenuItem,
} from "../../utils/utils.js";
import {auditDictionary} from "../../storage/auditDictionary.js";
import {
    errorHandling,
    minNumberOfServices,
    notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import {DataElementError} from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";
import {
    contentTypeItemsBody,
    contentTypeItemsHeaders,
    contentTypeItemsIndex,
    contentTypeItemsIndexDataElements, contentTypeItemsLocation, contentTypeItemsMetadata
} from "./contentTypeItems";

const auditId = "service";
const auditData = auditDictionary[auditId];

class SchoolServiceAudit extends Audit {
    public globalResults: any = {
        score: 1,
        details: {
            items: [],
            type: 'table',
            headings: [],
            summary: ''
        },
        errorMessage: ''
    };
    public wrongItems: any = [];
    public toleranceItems: any = [];
    public correctItems: any = [];
    public pagesInError : any = [];
    public score = 1;
    private titleSubHeadings: any = [];
    private headings : any = [];
    totalServices = 0;

    static get meta() {
        return {
            id: auditId,
            title: auditData.title,
            failureTitle: auditData.failureTitle,
            description: auditData.description,
            scoreDisplayMode: this.SCORING_MODES.NUMERIC,
            requiredArtifacts: ["origin"],
        };
    }

    async auditPage(
        page: Page | null,
        error?: string,
    ) {

        if (error && !page) {

            this.globalResults['score'] = 0;
            this.globalResults['details']['items'] =  [
                {
                    result: notExecutedErrorMessage.replace("<LIST>", error),
                },
            ];
            this.globalResults['details']['type'] = 'table';
            this.globalResults['details']['headings'] = [{key: "result", itemType: "text", text: "Risultato"}];
            this.globalResults['details']['summary'] = '';

            return {
                score: 0,
            }
        }

        if (page) {

            this.totalServices++;

            this.titleSubHeadings = [
                "Voci mancanti o senza contenuto",
                "Voci che non rispettano l'ordine richiesto",
            ];
            this.headings = [
                {
                    key: "result",
                    itemType: "text",
                    text: "Risultato",
                    subItemsHeading: {key: "inspected_page", itemType: "url"},
                },
                {
                    key: "title_missing_elements",
                    itemType: "text",
                    text: "",
                    subItemsHeading: {
                        key: "missing_elements",
                        itemType: "text",
                    },
                },
                {
                    key: "title_wrong_order_elements",
                    itemType: "text",
                    text: "",
                    subItemsHeading: {
                        key: "wrong_order_elements",
                        itemType: "text",
                    },
                },
            ];

            let url = '';

            try {
                url = page.url();
            } catch (ex) {
                if (!(ex instanceof DataElementError)) {
                    throw ex;
                }

                let errorMessage = ex.message;
                errorMessage = errorMessage.substring(
                    errorMessage.indexOf('"') + 1,
                    errorMessage.lastIndexOf('"')
                );

                this.pagesInError.push({
                    inspected_page: url,
                    wrong_order_elements: "",
                    missing_elements: errorMessage,
                });

                return {
                    score: 0,
                }
            }

            let data = await page.content();
            let $: CheerioAPI = await cheerio.load(data);

            const mandatoryVoices = contentTypeItemsIndex;
            const mandatoryVoicesDataElements = contentTypeItemsIndexDataElements;
            const mandatoryHeaderVoices = contentTypeItemsHeaders;
            const mandatoryBodyVoices = contentTypeItemsBody;
            const mandatoryPlaceInfo = contentTypeItemsLocation;

            const mandatoryMetadata = contentTypeItemsMetadata;

            const item = {
                missing_elements: "",
                wrong_order_elements: "",
                inspected_page: "",
            };

            item.inspected_page = url;

            let indexElements = await getServicesFromIndex($, mandatoryVoices);

            const mandatoryMenuItems = mandatoryVoices.map(toMenuItem);
            const orderResult = checkOrder(mandatoryMenuItems, indexElements);

            //For Contatti we don't check its content
            const indexElementsWithContent: string[] = ["Contatti"];

            for (const mandatoryVoiceDataElement of mandatoryVoicesDataElements.paragraph) {
                const dataElement = `[data-element="${mandatoryVoiceDataElement.data_element}"]`;
                const textContent = text($(dataElement));
                if (textContent.length >= 3) {
                    indexElementsWithContent.push(mandatoryVoiceDataElement.key);
                }
            }

            for (const mandatoryVoiceDataElement of mandatoryVoicesDataElements.exist) {
                const dataElement = `[data-element="${mandatoryVoiceDataElement.data_element}"]`;
                const element = $(dataElement);
                if (element.length > 0) {
                    indexElementsWithContent.push(mandatoryVoiceDataElement.key);
                }
            }

            indexElements = indexElements.filter((value) =>
                indexElementsWithContent.includes(value)
            );

            let missingMandatoryItems = missingMenuItems(
                indexElements,
                mandatoryMenuItems
            );

            const title = $('[data-element="service-title"]').text().trim() ?? "";
            if (title.length < 3) {
                missingMandatoryItems.push(mandatoryHeaderVoices[0]);
            }

            const description =
                $('[data-element="service-description"]').text().trim() ?? "";
            if (description.length < 3) {
                missingMandatoryItems.push(mandatoryHeaderVoices[1]);
            }

            let breadcrumbElements = await getPageElementDataAttribute(
                $,
                '[data-element="breadcrumb"]',
                "li"
            );
            breadcrumbElements = breadcrumbElements.map((x) =>
                x
                    .replaceAll(/[^a-zA-Z0-9 ]/g, "")
                    .trim()
                    .toLowerCase()
            );

            if (!checkBreadcrumb(breadcrumbElements)) {
                missingMandatoryItems.push(mandatoryHeaderVoices[2]);
            }

            const argumentsTag = await getPageElementDataAttribute(
                $,
                '[data-element="topic-list"]'
            );
            if (argumentsTag.length <= 0) {
                missingMandatoryItems.push(mandatoryHeaderVoices[3]);
            }

            const whatNeeds = $('[data-element="used-for"]').text().trim() ?? "";
            if (whatNeeds.length < 3) {
                missingMandatoryItems.push(mandatoryBodyVoices[0]);
            }

            const responsibleStructure = await getPageElementDataAttribute(
                $,
                '[data-element="structures"]',
                "a"
            );
            if (responsibleStructure.length <= 0) {
                missingMandatoryItems.push(mandatoryBodyVoices[1]);
            }

            const placeInfo = await getPlaceInfo($, mandatoryPlaceInfo);
            if (placeInfo.length > 0) {
                missingMandatoryItems = [...missingMandatoryItems, ...placeInfo];
            }

            const metadata = $('[data-element="metadata"]').text().trim() ?? "";
            if (
                !metadata.toLowerCase().includes(mandatoryMetadata[0].toLowerCase()) ||
                !metadata.toLowerCase().includes(mandatoryMetadata[1].toLowerCase())
            ) {
                missingMandatoryItems.push(mandatoryBodyVoices[2]);
            }

            item.missing_elements = missingMandatoryItems.join(", ");
            item.wrong_order_elements = orderResult.elementsNotInSequence.join(", ");

            const missingVoicesAmount = missingMandatoryItems.length;
            const voicesNotInCorrectOrderAmount =
                orderResult.numberOfElementsNotInSequence;

            if (missingVoicesAmount > 2 || voicesNotInCorrectOrderAmount > 1) {
                if (this.score > 0) {
                    this.score = 0;
                }

                this.wrongItems.push(item);
            } else if (
                (missingVoicesAmount > 0 && missingVoicesAmount <= 2) ||
                voicesNotInCorrectOrderAmount === 1
            ) {
                if (this.score > 0.5) {
                    this.score = 0.5;
                }

                this.toleranceItems.push(item);
            } else {
                this.correctItems.push(item);
            }

            return {
                score: this.score,
            };
        }
    }

    async getType(){
        return auditId;
    }

    async returnGlobal() {
        if (this.totalServices < minNumberOfServices) {
            this.globalResults['score'] = 0;
        }

        switch (this.score) {
            case 1:
                this.globalResults['details']['items'].push({
                    result: auditData.greenResult,
                });
                break;
            case 0.5:
                this.globalResults['details']['items'].push({
                    result: auditData.yellowResult,
                });
                break;
            case 0:
                this.globalResults['details']['items'].push({
                    result: auditData.redResult,
                });
                break;
        }

        const results = [];

        if (this.pagesInError.length) {
            results.push({
                result: errorHandling.errorMessage,
            });

            results.push({});

            results.push({
                result: errorHandling.errorColumnTitles[0],
                title_missing_elements: errorHandling.errorColumnTitles[1],
                title_wrong_order_elements: "",
            });


            for (const item of this.pagesInError) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }
        }

        results.push({});

        if (this.wrongItems.length > 0) {
            results.push({
                result: auditData.subItem.redResult,
                title_missing_elements: this.titleSubHeadings[0],
                title_wrong_order_elements: this.titleSubHeadings[1],
            });

            for (const item of this.wrongItems) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            results.push({});
        }

        if (this.toleranceItems.length > 0) {
            results.push({
                result: auditData.subItem.yellowResult,
                title_missing_elements: this.titleSubHeadings[0],
                title_wrong_order_elements: this.titleSubHeadings[1],
            });

            for (const item of this.toleranceItems) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            results.push({});
        }

        if (this.correctItems.length > 0) {
            results.push({
                result: auditData.subItem.greenResult,
                title_missing_elements: this.titleSubHeadings[0],
                title_wrong_order_elements: this.titleSubHeadings[1],
            });

            for (const item of this.correctItems) {
                results.push({
                    subItems: {
                        type: "subitems",
                        items: [item],
                    },
                });
            }

            results.push({});
        }

        this.globalResults.errorMessage =  this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
        this.globalResults.details.items = results;
        this.globalResults.details.headings = this.headings;
        this.globalResults.score = this.score;

        return this.globalResults;
    }

    static getInstance(): Promise<SchoolServiceAudit> {
        if (!SchoolServiceAudit.instance) {
            SchoolServiceAudit.instance = new SchoolServiceAudit('', [], []);
        }
        return SchoolServiceAudit.instance;
    }
}


export {SchoolServiceAudit};
export default SchoolServiceAudit.getInstance;


async function getServicesFromIndex(
    $: CheerioAPI,
    mandatoryElements: string[]
): Promise<string[]> {
    const indexList = await getPageElementDataAttribute(
        $,
        '[data-element="page-index"]',
        "> li > a"
    );

    const returnValues = [];
    for (const indexElement of indexList) {
        if (mandatoryElements.includes(indexElement)) {
            returnValues.push(indexElement);
        }
    }

    return returnValues;
}

async function getPlaceInfo($: CheerioAPI, mandatoryElements: string[]) {
    const elements = $('[data-element="places"]');

    if (elements.length <= 0) {
        return mandatoryElements;
    }

    const placeCards = [];
    for (const element of elements) {
        const placeCard = [];
        const innerElementLabels = $(element).find("div > span");
        const innerElementValues = $(element).find("div > p");

        const gps = await getElementHrefValuesDataAttribute(
            $,
            '[data-element="places"]',
            "a"
        );
        let gpsLabel = "";
        let gpsValue = "";
        for (const gpsElement of gps) {
            if (
                Boolean(gpsElement.label) &&
                Boolean(gpsElement.url) &&
                gpsElement.url.includes("map")
            ) {
                gpsLabel = "gps";
                gpsValue = gpsElement.url;
                break;
            }
        }

        if (gpsLabel) {
            placeCard.push({
                [gpsLabel]: gpsValue,
            });
        }

        for (
            let i = 0, j = 0;
            i < innerElementLabels.length, j < innerElementValues.length;
            i++, j++
        ) {
            const labelText =
                $(innerElementLabels[i]).text().trim().toLowerCase() ?? null;
            if (labelText) {
                let labelValue = "";

                if ($(innerElementValues[j])) {
                    labelValue =
                        $(innerElementValues[j]).text().trim().toLowerCase() ?? "";

                    while (
                        !labelText.match("(ora)") &&
                        (labelValue.match("^(2[0-3]|[01]?[0-9]):([0-5]?[0-9])$") ||
                            labelValue.match(
                                "^(2[0-3]|[01]?[0-9]):([0-5]?[0-9]):([0-5]?[0-9])$"
                            ))
                        ) {
                        j++;
                        labelValue =
                            $(innerElementValues[j]).text().trim().toLowerCase() ?? "";
                    }
                }

                placeCard.push({
                    [labelText]: labelValue,
                });
            }
        }

        placeCards.push(placeCard);
    }

    if (placeCards.length <= 0) {
        return [];
    }

    const foundElements = [];
    for (const cardElement of placeCards) {
        for (const cardElementObj of cardElement) {
            const key = Object.keys(cardElementObj);
            if (key.length <= 0) {
                continue;
            }
            const value = Object.values(cardElementObj) ?? [];

            if (
                Boolean(value[0].toLowerCase()) &&
                mandatoryElements.includes(key[0].toLowerCase())
            ) {
                foundElements.push(key[0].toLowerCase());
            }
        }
    }

    const removeDuplicates = [...new Set(foundElements)];

    return mandatoryElements.filter((val) => !removeDuplicates.includes(val));
}
