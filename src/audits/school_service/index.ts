import * as cheerio from "cheerio";
import { CheerioAPI, text } from "cheerio";
import {
  checkBreadcrumb,
  checkOrder,
  getElementHrefValuesDataAttribute,
  getPageElementDataAttribute,
  missingMenuItems,
  toMenuItem,
} from "../../utils/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  errorHandling,
  minNumberOfServices,
} from "../../config/commonAuditsParts.js";
import {Audit, GlobalResultsMulti} from "../Audit.js";
import { Page } from "puppeteer";
import {
  contentTypeItemsBody,
  contentTypeItemsHeaders,
  contentTypeItemsIndex,
  contentTypeItemsIndexDataElements,
  contentTypeItemsLocation,
  contentTypeItemsMetadata,
} from "./contentTypeItems.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

const auditId = "school-servizi-structure-match-model";
const auditData = auditDictionary[auditId];

class SchoolServiceAudit extends Audit {
  public globalResults: GlobalResultsMulti = {
    score: 1,
    details: {
      items: [],
      type: "table",
      summary: "",
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    wrongPages: {
      message: "",
      headings: [],
      pages: [],
    },
    tolerancePages: {
      message: "",
      headings: [],
      pages: [],
    },
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  code = "R.SC.1.2";
  mainTitle = "SCHEDE INFORMATIVE DI SERVIZIO";

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];
  totalServices = 0;

  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: auditId,
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    this.titleSubHeadings = [
      "Voci mancanti o senza contenuto",
      "Voci che non rispettano l'ordine richiesto",
    ];

    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: "",
        missing_elements: error,
        wrong_order_elements: "",
      });

      return {
        score: 0,
      };
    }

    if (page) {
      this.totalServices++;

      const url = page.url();

      const data = await page.content();
      const $: CheerioAPI = await cheerio.load(data);

      const mandatoryVoices = contentTypeItemsIndex;
      const mandatoryVoicesDataElements = contentTypeItemsIndexDataElements;
      const mandatoryHeaderVoices = contentTypeItemsHeaders;
      const mandatoryBodyVoices = contentTypeItemsBody;
      const mandatoryPlaceInfo = contentTypeItemsLocation;

      const mandatoryMetadata = contentTypeItemsMetadata;

      const item = {
        link: "",
        missing_elements: "",
        wrong_order_elements: "",
      };

      item.link = url;

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
        indexElementsWithContent.includes(value),
      );

      let missingMandatoryItems = missingMenuItems(
        indexElements,
        mandatoryMenuItems,
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
        "li",
      );
      breadcrumbElements = breadcrumbElements.map((x) =>
        x
          .replaceAll(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .toLowerCase(),
      );

      if (!checkBreadcrumb(breadcrumbElements)) {
        missingMandatoryItems.push(mandatoryHeaderVoices[2]);
      }

      const argumentsTag = await getPageElementDataAttribute(
        $,
        '[data-element="topic-list"]',
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
        "a",
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

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if(this.globalResults.tolerancePages){
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    if (this.totalServices < minNumberOfServices) {
      this.globalResults["score"] = 0;
    }

    switch (this.score) {
      case 1:
        this.globalResults["details"]["items"].push({
          result: auditData.greenResult,
        });
        break;
      case 0.5:
        this.globalResults["details"]["items"].push({
          result: auditData.yellowResult,
        });
        break;
      case 0:
        this.globalResults["details"]["items"].push({
          result: auditData.redResult,
        });
        break;
    }

    const results = [];

    if (this.pagesInError.length) {
      this.globalResults.error = true;

      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_missing_elements: errorHandling.errorColumnTitles[1],
        title_wrong_order_elements: "",
      });

      this.globalResults.pagesInError.message = errorHandling.errorMessage;
      this.globalResults.pagesInError.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];

      for (const item of this.pagesInError) {
        this.globalResults.pagesInError.pages.push(item);
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

      this.globalResults.wrongPages.headings = [
        auditData.subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
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
      if(this.globalResults.tolerancePages){
        this.globalResults.tolerancePages.headings = [
          auditData.subItem.yellowResult,
          this.titleSubHeadings[0],
          this.titleSubHeadings[1],
        ];

        for (const item of this.toleranceItems) {
          this.globalResults.tolerancePages.pages.push(item);
          results.push({
            subItems: {
              type: "subitems",
              items: [item],
            },
          });
        }
      }


      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: auditData.subItem.greenResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });
      this.globalResults.correctPages.headings = [
        auditData.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.details.items = results;
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.score == 0.5) {
      status = "average";
      message = this.auditData.yellowResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): SchoolServiceAudit {
    if (!SchoolServiceAudit.instance) {
      SchoolServiceAudit.instance = new SchoolServiceAudit;
    }
    return <SchoolServiceAudit>SchoolServiceAudit.instance;
  }
}

export { SchoolServiceAudit };
export default SchoolServiceAudit.getInstance;

async function getServicesFromIndex(
  $: CheerioAPI,
  mandatoryElements: string[],
): Promise<string[]> {
  const indexList = await getPageElementDataAttribute(
    $,
    '[data-element="page-index"]',
    "> li > a",
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
      "a",
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
                "^(2[0-3]|[01]?[0-9]):([0-5]?[0-9]):([0-5]?[0-9])$",
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
