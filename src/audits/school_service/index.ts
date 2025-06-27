import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import {
  checkBreadcrumb,
  checkOrderLoose,
  getElementHrefValuesDataAttribute,
  getPageElementDataAttribute,
  missingMenuItems,
  redirectUrlIsInternal,
  safePageContent,
  toMenuItem,
} from "../../utils/utils.js";
import {
  errorHandling,
  minNumberOfServices,
} from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
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
import { __dirname } from "../esmHelpers.js";

const auditId = "school-servizi-structure-match-model";
const greenResult =
  "In tutte le pagine analizzate tutte le voci obbligatorie e i relativi contenuti sono presenti e, dove richiesto, sono nell'ordine corretto.";
const yellowResult =
  "In almeno una delle pagine analizzate fino a 2 voci obbligatorie o i relativi contenuti non sono presenti o 1 voce non è nell'ordine corretto.";
const redResult =
  "In almeno una delle pagine analizzate più di 2 voci obbligatorie o i relativi contenuti non sono presenti o più di 1 voce non è nell'ordine corretto.";
const subItem = {
  greenResult:
    "Pagine nelle quali tutte le voci obbligatorie e i relativi contenuti sono presenti e, dove richiesto, sono nell'ordine corretto:",
  yellowResult:
    "Pagine nelle quali fino a 2 voci obbligatorie o i relativi contenuti non sono presenti o 1 voce non è nell'ordine corretto:",
  redResult:
    "Pagine nelle quali più di 2 voci obbligatorie o i relativi contenuti non sono presenti o più di 1 voce non è nell'ordine corretto:",
};
const title =
  "R.SC.1.2 - SCHEDE INFORMATIVE DI SERVIZIO - Tutte le schede informative dei servizi devono mostrare le voci segnalate come obbligatorie all'interno dell'architettura dell'informazione, nell'ordine segnalato dal modello.";
const code = "R.SC.1.2";
const mainTitle = "SCHEDE INFORMATIVE DI SERVIZIO";

const FOLDER_NAME = "school_service";

class SchoolServiceAudit extends Audit {
  info = true;
  public globalResults: GlobalResultsMulti = {
    score: 1,
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
    info: true,
  };

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];
  totalServices = 0;

  async meta() {
    return {
      id: auditId,
      title: title,
      code: code,
      mainTitle: mainTitle,
      auditId: auditId,
    };
  }

  getFolderName(): string {
    return FOLDER_NAME;
  }

  async auditPage(page: Page, url: string) {
    if (!(await redirectUrlIsInternal(page))) {
      return;
    }

    this.titleSubHeadings = [
      "Voci mancanti o senza contenuto",
      "Voci che non rispettano l'ordine richiesto",
    ];

    const data = await safePageContent(page);
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
    const orderResult = checkOrderLoose(mandatoryMenuItems, indexElements);

    //For Contatti we don't check its content
    const indexElementsWithContent: string[] = ["Contatti"];

    for (const mandatoryVoiceDataElement of mandatoryVoicesDataElements.paragraph) {
      const dataElement = `[data-element="${mandatoryVoiceDataElement.data_element}"]`;
      const textContent = $(dataElement).text();
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
    if (!orderResult.inOrder) {
      if (
        orderResult.singleMove.length > 0 &&
        orderResult.singleMove.length <= 2
      ) {
        item.wrong_order_elements = orderResult.singleMove.join(", ");
      } else {
        item.wrong_order_elements = "Più di una voce non in ordine";
      }
    }

    const missingVoicesAmount = missingMandatoryItems.length;
    const moreThanAVoice =
      !orderResult.inOrder && orderResult.singleMove.length === 0;
    const onlyOneVoice =
      !orderResult.inOrder &&
      orderResult.singleMove.length > 0 &&
      orderResult.singleMove.length <= 2;

    if (missingVoicesAmount > 2 || moreThanAVoice) {
      if (this.score > 0) {
        this.score = 0;
      }

      this.wrongItems.push(item);
    } else if (
      (missingVoicesAmount > 0 && missingVoicesAmount <= 2) ||
      onlyOneVoice
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

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if (this.globalResults.tolerancePages) {
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];

    if (this.totalServices < minNumberOfServices) {
      this.globalResults["score"] = 0;
    }

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
      }
    }

    if (this.toleranceItems.length > 0) {
      if (this.globalResults.tolerancePages) {
        this.globalResults.tolerancePages.headings = [
          subItem.yellowResult,
          this.titleSubHeadings[0],
          this.titleSubHeadings[1],
        ];

        for (const item of this.toleranceItems) {
          this.globalResults.tolerancePages.pages.push(item);
        }
      }
    }

    if (this.correctItems.length > 0) {
      this.globalResults.correctPages.headings = [
        subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = greenResult;
    } else if (this.score == 0.5) {
      status = "pass";
      message = yellowResult;
    } else {
      status = "fail";
      message = redResult;
    }

    return await ejs.renderFile(__dirname + `/${FOLDER_NAME}/template.ejs`, {
      ...(await this.meta()),
      code: code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): SchoolServiceAudit {
    if (!SchoolServiceAudit.instance) {
      SchoolServiceAudit.instance = new SchoolServiceAudit();
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
