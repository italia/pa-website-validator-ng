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
import { __dirname } from "../esmHelpers.js";

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

  getFolderName(): string {
    return "municipality_contacts_assistency_audit";
  }
  async auditPage(page: Page, url: string) {
    this.titleSubHeadings = [
      "La voce è presente nell'indice",
      "Il componente è presente in pagina",
    ];

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

      this.wrongItems.push({
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

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];

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

    this.globalResults.score = this.score;
    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";

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

    return await ejs.renderFile(
      __dirname + "/municipality_contacts_assistency_audit/template.ejs",
      {
        ...(await this.meta()),
        code: code,
        table: this.globalResults,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
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
