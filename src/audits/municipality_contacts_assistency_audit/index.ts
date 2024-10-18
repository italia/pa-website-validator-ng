"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getPageElementDataAttribute } from "../../utils/utils.js";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

const auditId = "municipality-contacts-assistency";
const code = "C.SI.2.2";
const mainTitle = "RICHIESTA DI ASSISTENZA / CONTATTI";
const title =
  "C.SI.2.2 - RICHIESTA DI ASSISTENZA / CONTATTI - All'interno del sito comunale, nel contenuto della scheda servizio, devono essere comunicati i contatti dell'ufficio preposto all'erogazione del servizio.";
const greenResult =
  'In tutte le schede servizio analizzate la voce "Contatti" è presente.';
const redResult =
  'In almeno una delle schede servizio analizzate la voce "Contatti" è assente.';
const subItem = {
  greenResult:
    'Schede servizio analizzate nelle quali la voce "Contatti" è presente:',
  redResult:
    'Schede servizio analizzate nelle quali la voce "Contatti" è assente:',
};

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

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  async meta() {
    return {
      id: auditId,
      title: title,
      code: code,
      mainTitle: mainTitle,
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

      let $: CheerioAPI = cheerio.load("<html><body></body></html>");

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
      this.globalResults.error = true;

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
            result: greenResult,
          });
          break;
        case 0:
          results.push({
            result: redResult,
          });
          break;
      }
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: subItem.redResult,
        title_in_index: this.titleSubHeadings[0],
        title_component_exists: this.titleSubHeadings[1],
      });

      this.globalResults.wrongPages.headings = [
        subItem.redResult,
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
        result: subItem.greenResult,
        title_in_index: this.titleSubHeadings[0],
        title_component_exists: this.titleSubHeadings[1],
      });

      this.globalResults.correctPages.headings = [
        subItem.greenResult,
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
      message = greenResult;
    } else {
      status = "fail";
      message = redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: code,
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

  static getInstance(): ContactAssistencyAudit {
    if (!ContactAssistencyAudit.instance) {
      ContactAssistencyAudit.instance = new ContactAssistencyAudit();
    }
    return <ContactAssistencyAudit>ContactAssistencyAudit.instance;
  }
}

export { ContactAssistencyAudit };
export default ContactAssistencyAudit.getInstance;
