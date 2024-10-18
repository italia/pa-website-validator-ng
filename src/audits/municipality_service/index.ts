// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as cheerio from "cheerio";
import { CheerioAPI, text } from "cheerio";

import {
  checkBreadcrumb,
  checkOrder,
  getPageElementDataAttribute,
  missingMenuItems,
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
import {Audit, GlobalResultsMulti} from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class ServiceAudit extends Audit {
  auditId = "municipality-servizi-structure-match-model";  
  code = "C.SI.1.3";
  mainTitle = "SCHEDE INFORMATIVE DI SERVIZIO PER IL CITTADINO";
  title = "C.SI.1.3 - SCHEDE INFORMATIVE DI SERVIZIO PER IL CITTADINO - Tutte le schede informative dei servizi per il cittadino devono mostrare le voci segnalate come obbligatorie all'interno dell'architettura dell'informazione, nell'ordine segnalato dal modello.";
  greenResult = "Sono presenti almeno 10 schede servizio e in tutte le pagine analizzate tutte le voci obbligatorie e i relativi contenuti sono presenti e, dove richiesto, sono nell'ordine corretto.";
  yellowResult = "Sono presenti almeno 10 schede servizio e in almeno una delle pagine analizzate fino a 2 voci obbligatorie o i relativi contenuti non sono presenti o 1 voce non è nell'ordine corretto.";
  redResult = "Non sono presenti almeno 10 schede servizio o in almeno una delle pagine analizzate più di 2 voci obbligatorie o i relativi contenuti non sono presenti o più di 1 voce non è nell'ordine corretto.";
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

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];
  totalServices = 0;

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      
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
        link: url,
        missing_elements: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      this.totalServices++;

      const mandatoryIndexVoices = contentTypeItemsIndex;
      const mandatoryVoicesDataElements = contentTypeItemsIndexDataElement;
      const mandatoryHeaderVoices = contentTypeItemsHeaders;
      const mandatoryBodyVoices = contentTypeItemsBody;

      const url = page.url();

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
      const orderResult = checkOrder(mandatoryMenuItems, indexElements);

      const indexElementsWithContent: string[] = [];

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
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if(this.globalResults.tolerancePages){
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    if (Number(process.env["numberOfServicesFound"]) < minNumberOfServices) {
      this.globalResults["score"] = 0;
    }

    const results = [];

    switch (this.score) {
      case 1:
        results.push({
          result: this.greenResult,
        });
        break;
      case 0.5:
        results.push({
          result: this.yellowResult,
        });
        break;
      case 0:
        results.push({
          result: this.redResult,
        });
        break;
    }

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
        result: this.subItem.redResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });

      this.globalResults.wrongPages.headings = [
        this.subItem.redResult,
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
        result: this.subItem.yellowResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });

      if(this.globalResults.tolerancePages){
        this.globalResults.tolerancePages.headings = [
          this.subItem.yellowResult,
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
        result: this.subItem.greenResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });

      this.globalResults.correctPages.headings = [
        this.subItem.greenResult,
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

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.score == 0.5) {
      status = "average";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
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
