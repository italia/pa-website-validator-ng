// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";

import {
  checkBreadcrumb,
  checkOrderLoose,
  getPageElementDataAttribute,
  missingMenuItems,
  redirectUrlIsInternal,
  toMenuItem,
} from "../../utils/utils.js";
import {
  contentTypeItemsBody,
  contentTypeItemsHeaders,
  contentTypeItemsIndex,
  contentTypeItemsIndexDataElement,
} from "../../storage/municipality/contentTypeItems.js";
import {
  errorHandling,
  minNumberOfServices,
} from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "municipality_service";

class ServiceAudit extends Audit {
  auditId = "municipality-servizi-structure-match-model";
  code = "C.SI.1.3";
  mainTitle = "SCHEDE INFORMATIVE DI SERVIZIO PER IL CITTADINO";
  title =
    "C.SI.1.3 - SCHEDE INFORMATIVE DI SERVIZIO PER IL CITTADINO - Tutte le schede informative dei servizi per il cittadino devono mostrare le voci segnalate come obbligatorie all'interno dell'architettura dell'informazione, nell'ordine segnalato dal modello.";
  greenResult = `Sono presenti almeno ${process.env["numberOfServicePages"] ?? minNumberOfServices} schede servizio e in tutte le pagine analizzate tutte le voci obbligatorie e i relativi contenuti sono presenti e, dove richiesto, sono nell'ordine corretto.`;
  yellowResult = `Sono presenti almeno ${process.env["numberOfServicePages"] ?? minNumberOfServices} schede servizio e in almeno una delle pagine analizzate fino a 2 voci obbligatorie o i relativi contenuti non sono presenti o 1 voce non è nell'ordine corretto.`;
  redResult = `Non sono presenti almeno ${process.env["numberOfServicePages"] ?? minNumberOfServices} schede servizio o in almeno una delle pagine analizzate più di 2 voci obbligatorie o i relativi contenuti non sono presenti o più di 1 voce non è nell'ordine corretto.`;
  subItem = {
    greenResult:
      "Pagine nelle quali tutte le voci obbligatorie e i relativi contenuti sono presenti e, dove richiesto, sono nell'ordine corretto:",
    yellowResult:
      "Pagine nelle quali fino a 2 voci obbligatorie o i relativi contenuti non sono presenti o 1 voce non è nell'ordine corretto:",
    redResult:
      "Pagine nelle quali più di 2 voci obbligatorie o i relativi contenuti non sono presenti o più di 1 voce non è nell'ordine corretto:",
  };

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
  };

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
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

    const mandatoryIndexVoices = contentTypeItemsIndex;
    const mandatoryVoicesDataElements = contentTypeItemsIndexDataElement;
    const mandatoryHeaderVoices = contentTypeItemsHeaders;
    const mandatoryBodyVoices = contentTypeItemsBody;

    const data = await page.content();
    const $: CheerioAPI = await cheerio.load(data);

    const item = {
      link: "",
      missing_elements: "",
      wrong_order_elements: "",
    };

    item.link = url;

    let indexElements = await getServicesFromIndex($, mandatoryIndexVoices);

    const mandatoryMenuItems = mandatoryIndexVoices.map(toMenuItem);
    const orderResult = checkOrderLoose(mandatoryMenuItems, indexElements);

    const indexElementsWithContent: string[] = [];

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

    const missingMandatoryItems = missingMenuItems(
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

    const status = $('[data-element="service-status"]');

    if (status.length <= 0) {
      missingMandatoryItems.push(mandatoryHeaderVoices[2]);
    }

    const argumentsTag = await getPageElementDataAttribute(
      $,
      '[data-element="service-topic"]',
    );
    if (argumentsTag.length <= 0) {
      missingMandatoryItems.push(mandatoryHeaderVoices[3]);
    }

    let breadcrumbElements = await getPageElementDataAttribute(
      $,
      '[data-element="breadcrumb"]',
      "li",
    );
    breadcrumbElements = breadcrumbElements.map((x) =>
      x
        .toLowerCase()
        .replaceAll(/[^a-zA-Z0-9 ]/g, "")
        .trim(),
    );

    if (!checkBreadcrumb(breadcrumbElements)) {
      missingMandatoryItems.push(mandatoryHeaderVoices[4]);
    }

    const area = $('[data-element="service-area"]').text().trim() ?? "";
    if (area.length < 3) {
      missingMandatoryItems.push(mandatoryBodyVoices[0]);
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

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if (this.globalResults.tolerancePages) {
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];

    const servicesNumber = process.env["numberOfServicePages"]
      ? parseInt(process.env["numberOfServicePages"])
      : minNumberOfServices;
    if (Number(process.env["numberOfServicesFound"]) < servicesNumber) {
      this.globalResults["score"] = 0;
      this.score = 0;
    }

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        this.subItem.redResult,
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
          this.subItem.yellowResult,
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
        this.subItem.greenResult,
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

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.score == 0.5) {
      status = "pass";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    return await ejs.renderFile(__dirname + `/${FOLDER_NAME}/template.ejs`, {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
      serviceNum: process.env["numberOfServicePages"] ?? minNumberOfServices,
    });
  }

  static getInstance(): ServiceAudit {
    if (!ServiceAudit.instance) {
      ServiceAudit.instance = new ServiceAudit();
    }
    return <ServiceAudit>ServiceAudit.instance;
  }
}

export { ServiceAudit };
export default ServiceAudit.getInstance;

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
