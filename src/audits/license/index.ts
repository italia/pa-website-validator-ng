"use strict";

import { CheerioAPI } from "cheerio";

import { initializePuppeteer } from "./../../PuppeteerInstance.js";
import { buildUrl, isInternalUrl, urlExists } from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { legalNotes } from "./legalNotes.js";
import * as cheerio from "cheerio";
import { Gatherer } from "../../gatherers/Gatherer.js";

class LicenceAudit extends Audit {
  code = "";
  mainTitle = "";
  title = "";

  public globalResults: GlobalResults = {
    score: 0,
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  async meta() {
    return {
      id: this.auditId,
      title: this.title,
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page, url: string) {
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
        result: this.redResult,
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
        this.globalResults.score = 0;
        this.globalResults.id = this.auditId;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      items[0].link_name = legalNotesElements.text().trim() ?? "";
      items[0].page_section = "No";
      items[0].page_contains_correct_text = "No";

        const browser = await initializePuppeteer();
        const legalNotesPage = await browser.newPage();

        legalNotesPage.on("dialog", async (dialog: any) => {
          console.log(
            `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Navigation to ${url} interrupted by dialog with message : "${dialog.message()}"`,
          );
          await dialog.dismiss();
          console.log(
            `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} Dismissed dialog`,
          );
        });

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
        items[0].result = this.greenResult;
        score = 1;
      }
    }

    this.globalResults.score = score;
    this.globalResults.id = this.auditId;
    this.globalResults.pagesItems.pages = items;

    return {
      score: score,
    };
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async getType() {
    return this.auditId;
  }

  static getInstance(): LicenceAudit {
    if (!LicenceAudit.instance) {
      LicenceAudit.instance = new LicenceAudit();
    }
    return <LicenceAudit>LicenceAudit.instance;
  }
}

export { LicenceAudit };
export default LicenceAudit.getInstance;
