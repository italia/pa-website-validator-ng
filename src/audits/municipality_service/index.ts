// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
import { auditDictionary } from "../../storage/auditDictionary.js";

import {
  errorHandling,
  minNumberOfServices,
} from "../../config/commonAuditsParts.js";
import { Audit } from "../Audit.js";
import { Page } from "puppeteer";
import * as cheerio from "cheerio";
import * as ejs from "ejs";

class ServiceAudit extends Audit {
  auditId = "municipality-servizi-structure-match-model";
  auditData = auditDictionary["municipality-servizi-structure-match-model"];
  code = "C.SI.1.3";
  mainTitle = "SCHEDE INFORMATIVE DI SERVIZIO PER IL CITTADINO";

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: "table",
      headings: [],
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
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError: any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings: any = [];
  totalServices = 0;

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    this.titleSubHeadings = [
      "Voci mancanti o senza contenuto",
      "Voci che non rispettano l'ordine richiesto",
    ];
    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato",
        subItemsHeading: { key: "inspected_page", itemType: "url" },
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

      //console.log(`Results: ${JSON.stringify(this.globalResults)}`);

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
    this.globalResults.tolerancePages.pages = [];
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    if (Number(process.env["numberOfServicesFound"]) < minNumberOfServices) {
      this.globalResults["score"] = 0;
    }

    const results = [];

    switch (this.score) {
      case 1:
        results.push({
          result: this.auditData.greenResult,
        });
        break;
      case 0.5:
        results.push({
          result: this.auditData.yellowResult,
        });
        break;
      case 0:
        results.push({
          result: this.auditData.redResult,
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
        result: this.auditData.subItem.redResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });

      this.globalResults.wrongPages.headings = [
        this.auditData.subItem.redResult,
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
        result: this.auditData.subItem.yellowResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });

      this.globalResults.tolerancePages.headings = [
        this.auditData.subItem.yellowResult,
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

      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: this.auditData.subItem.greenResult,
        title_missing_elements: this.titleSubHeadings[0],
        title_wrong_order_elements: this.titleSubHeadings[1],
      });

      this.globalResults.correctPages.headings = [
        this.auditData.subItem.greenResult,
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
    this.globalResults.details.headings = this.headings;
    this.globalResults.score = this.score;

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

    const reportHtml = await ejs.renderFile(
      "src/audits/municipality_service/template.ejs",
      {
        ...(await this.meta()),
        code: this.code,
        table: this.globalResults,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
    return reportHtml;
  }

  static getInstance(): Promise<ServiceAudit> {
    if (!ServiceAudit.instance) {
      ServiceAudit.instance = new ServiceAudit("", [], []);
    }
    return ServiceAudit.instance;
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
