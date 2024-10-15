"use strict";

import { CheerioAPI } from "cheerio";

import { initializePuppeteer } from "./../../PuppeteerInstance.js";
import { buildUrl, isInternalUrl, urlExists } from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit } from "../Audit.js";
import {
  errorHandling,
  notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import { legalNotes } from "./legalNotes.js";
import * as cheerio from "cheerio";
import { Gatherer } from "../../gatherers/Gatherer.js";

class LicenceAudit extends Audit {
  code = "";
  mainTitle = "";

  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: "table",
      headings: [],
      summary: "",
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  private headings: any = [];

  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page | null, error?: string) {
    if (error && !page) {
      this.globalResults.score = 0;
      this.globalResults.details.items.push({
        result: notExecutedErrorMessage.replace("<LIST>", error),
      });
      this.globalResults.details.headings = [
        { key: "result", itemType: "text", text: "Risultato" },
      ];

      this.globalResults.pagesItems.headings = ["Risultato"];
      this.globalResults.pagesItems.message = notExecutedErrorMessage.replace(
        "<LIST>",
        error,
      );
      this.globalResults.pagesItems.items = [
        {
          result: this.auditData.redResult,
        },
      ];

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      this.headings = [
        {
          key: "result",
          itemType: "text",
          text: "Risultato",
        },
        {
          key: "link_name",
          itemType: "text",
          text: "Testo del link",
        },
        {
          key: "link_destination",
          itemType: "url",
          text: "Pagina di destinazione del link",
        },
        {
          key: "page_section",
          itemType: "text",
          text: "Il titolo della sezione è corretto",
        },
        {
          key: "page_contains_correct_text",
          itemType: "text",
          text: "La dicitura è corretta",
        },
      ];

      this.globalResults.pagesItems.headings = [
        "Risultato",
        "Testo del link",
        "Pagina di destinazione del link",
        "Il titolo della sezione è corretto",
        "La dicitura è corretta",
      ];

      let score = 0;

      const items = [
        {
          result: this.auditData.redResult,
          link_name: "",
          link: "",
          page_section: "",
          page_contains_correct_text: "",
        },
      ];

      const data = await page.content();
      const $: CheerioAPI = await cheerio.load(data);

      const dataElementLegalNotes = `[data-element="${legalNotes.dataElement}"]`;
      const legalNotesElements = $("footer").find(dataElementLegalNotes);
      const elementObj = $(legalNotesElements).attr();

      if (elementObj && "href" in elementObj && elementObj["href"] !== "#") {
        let pageUrl = elementObj.href;
        if ((await isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
          pageUrl = await buildUrl(url, pageUrl);
        }
        items[0].link = pageUrl;

        const checkUrl = await urlExists(url, pageUrl);
        if (!checkUrl.result) {
          return {
            score: 0,
            details: {
              items: items,
              type: "table",
              headings: this.headings,
              summary: "",
            },
          };
        }

        items[0].link_name = legalNotesElements.text().trim() ?? "";
        items[0].page_section = "No";
        items[0].page_contains_correct_text = "No";

        const browser = await initializePuppeteer();
        const legalNotesPage = await browser.newPage(); //TODO: da verificare se fatto in questo modo è corretto, secondo me dovremmo creare un gatherer dedicato a questa tipologia di pagina
        await Gatherer.gotoRetry(
          legalNotesPage,
          pageUrl,
          errorHandling.gotoRetryTentative,
        );

        const data = await legalNotesPage.content();
        const $: CheerioAPI = await cheerio.load(data);

        const sectionDataElement = `[data-element="${legalNotes.section.dataElement}"]`;
        const sectionElement = $(sectionDataElement);
        const sectionTitle = sectionElement?.text().trim().toLowerCase() ?? "";
        if (
          sectionElement.length > 0 &&
          sectionTitle === legalNotes.section.title.toLowerCase()
        ) {
          items[0].page_section = "Sì";
        }

        const bodyDataElement = `[data-element="${legalNotes.body.dataElement}"]`;
        const bodyElements = $(bodyDataElement);
        let textBody = "";
        for (const bodyElement of bodyElements) {
          textBody += $(bodyElement).text();
          textBody += " ";
        }
        textBody = textBody
          .trim()
          .toLowerCase()
          .replaceAll(/\s+/g, " ")
          .replaceAll("'", "’");

        if (textBody === legalNotes.body.text.toLowerCase()) {
          items[0].page_contains_correct_text = "Sì";
        }

        if (
          items[0].page_section === "Sì" &&
          items[0].page_contains_correct_text === "Sì"
        ) {
          items[0].result = this.auditData.greenResult;
          score = 1;
        }
      }

      this.globalResults.score = score;
      this.globalResults.details.items = items;
      this.globalResults.details.headings = this.headings;
      this.globalResults.id = this.auditId;
      this.globalResults.pagesItems.pages = items;

      return {
        score: score,
      };
    }
  }

  async getType() {
    return this.auditId;
  }

  static getInstance(): Promise<LicenceAudit> {
    if (!LicenceAudit.instance) {
      LicenceAudit.instance = new LicenceAudit("", [], []);
    }
    return LicenceAudit.instance;
  }
}

export { LicenceAudit };
export default LicenceAudit.getInstance;
