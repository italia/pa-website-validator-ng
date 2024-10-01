"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { CheerioAPI } from "cheerio";
import {
  buildUrl,
  isInternalUrl,
  urlExists,
} from "../../utils/utils.js";
import { legalNotes } from "../../storage/common/legalNotes.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";


const auditId = "municipality-license-and-attribution";
const auditData = auditDictionary[auditId];

class LicenceAndAttributionAudit extends Audit {
  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    errorMessage: ''
  };
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError : any = [];
  public score = 0;
  private headings : any = [];

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null
  ) {
    if(page){
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

      const items = [
        {
          result: auditData.redResult,
          link_name: "",
          link_destination: "",
          page_section: "",
          page_contains_correct_text: "",
        },
      ];

      const dataElementLegalNotes = `[data-element="${legalNotes.dataElement}"]`;
      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);
      const legalNotesElements = $("footer").find(dataElementLegalNotes);
      const elementObj = $(legalNotesElements).attr();

      if (elementObj && "href" in elementObj && elementObj["href"] !== "#") {
        let pageUrl = elementObj.href;
        if ((await isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
          pageUrl = await buildUrl(url, pageUrl);
        }
        items[0].link_destination = pageUrl;

        const checkUrl = await urlExists(url, pageUrl);
        if (!checkUrl.result) {
          this.globalResults.details.items = this.headings;
          this.globalResults.details.headings = items;
          this.globalResults.score = 0;
          this.score = 0;
          return {
            score: 0,
          };
        }

        items[0].link_name = legalNotesElements.text().trim() ?? "";
        items[0].page_section = "No";
        items[0].page_contains_correct_text = "No";

        let data = await page.content();
        let $: CheerioAPI = await cheerio.load(data);

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
          items[0].result = auditData.greenResult;
          this.globalResults.details.items = this.headings;
          this.globalResults.details.headings = items;
          this.globalResults.score = 1;
          this.score = 1;
        }
      }
    }


    return {
      score: this.score,
    };
  }

  static getInstance(): Promise<LicenceAndAttributionAudit> {
    if (!LicenceAndAttributionAudit.instance) {
      LicenceAndAttributionAudit.instance = new LicenceAndAttributionAudit('', [], []);
    }
    return LicenceAndAttributionAudit.instance;
  }
}
