"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
  getPageElementDataAttribute,
} from "../../utils/utils.js";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import {Audit, GlobalResultsMulti} from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

const auditId = "municipality-contacts-assistency";
const auditData = auditDictionary[auditId];

class ContactAssistencyAudit extends Audit {
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
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  code = "C.SI.2.2";
  mainTitle = "RICHIESTA DI ASSISTENZA / CONTATTI";

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

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
      "La voce è presente nell'indice",
      "Il componente è presente in pagina",
    ];

    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        in_index: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      let $: CheerioAPI = cheerio.load('<html><body></body></html>');

      try {
        const data = await page.content();
        $ = await cheerio.load(data);
      } catch (ex) {
        if (!(ex instanceof Error)) {
          throw ex;
        }

        let errorMessage = ex.message;
        errorMessage = errorMessage.substring(
          errorMessage.indexOf('"') + 1,
          errorMessage.lastIndexOf('"'),
        );

        this.pagesInError.push({
          link: url,
          in_index: errorMessage,
        });
      }

      const item = {
        link: url,
        in_index: "No",
        component_exists: "No",
      };

      const indexList = await getPageElementDataAttribute(
        $,
        '[data-element="page-index"]',
        "> li > a",
      );

      if (indexList.includes("Contatti")) {
        item.in_index = "Sì";
      }

      const contactComponent = $('[data-element="service-area"]');

      if (contactComponent.length > 0) {
        item.component_exists = "Sì";
      }

      let contactsPresent = false;
      if (indexList.includes("Contatti") && contactComponent.length > 0) {
        contactsPresent = true;
      }

      if (!contactsPresent) {
        this.score = 0;
        this.wrongItems.push(item);
      }
      this.correctItems.push(item);
    }

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    const results = [];
    if (this.pagesInError.length > 0) {
      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_in_index: errorHandling.errorColumnTitles[1],
        title_component_exists: "",
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
    } else {
      switch (this.score) {
        case 1:
          results.push({
            result: auditData.greenResult,
          });
          break;
        case 0:
          results.push({
            result: auditData.redResult,
          });
          break;
      }
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: auditData.subItem.redResult,
        title_in_index: this.titleSubHeadings[0],
        title_component_exists: this.titleSubHeadings[1],
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

    if (this.correctItems.length > 0) {
      results.push({
        result: auditData.subItem.greenResult,
        title_in_index: this.titleSubHeadings[0],
        title_component_exists: this.titleSubHeadings[1],
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

    this.globalResults.score = this.score;
    this.globalResults.details.items = results;
    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
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

  async getType() {
    return auditId;
  }

  static getInstance(): Promise<ContactAssistencyAudit> {
    if (!ContactAssistencyAudit.instance) {
      ContactAssistencyAudit.instance = new ContactAssistencyAudit("", [], []);
    }
    return ContactAssistencyAudit.instance;
  }
}

export { ContactAssistencyAudit };
export default ContactAssistencyAudit.getInstance;
