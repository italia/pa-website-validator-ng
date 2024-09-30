"use strict";

import { CheerioAPI } from "cheerio";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

import { getAllPageHTML, loadPageData, urlExists } from "../../utils/utils";
import { auditDictionary } from "../../storage/auditDictionary";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {errorHandling, notExecutedErrorMessage} from "../../config/commonAuditsParts";
import * as cheerio from "cheerio";

const auditId = "municipality-legislation-accessibility-declaration-is-present";
const auditData = auditDictionary[auditId];

class AccAudit extends Audit {
  public globalResults: any = {};
  private wrongItems: any = [];
  private toleranceItems: any = [];
  private correctItems: any = [];
  private pagesInError : any = [];
  private score = 0;
  private titleSubHeadings: any = [];
  private headings : any = [];

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async audit(
      page: Page | null,
      error?: string,
  ) {
    if(error && !page){

      this.globalResults['score'] = 0;
      this.globalResults['details']['items'].push([
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ]);
      this.globalResults['details']['type'] = 'table';
      this.globalResults['details']['headings'] = [{ key: "result", itemType: "text", text: "Risultato" }];
      this.globalResults['details']['summary'] = '';

      return {
        score: 0,
      }
    }

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
          key: "existing_page",
          itemType: "text",
          text: "Pagina esistente",
        },
        {
          key: "page_contains_correct_url",
          itemType: "text",
          text: "La pagina contiene l'url del sito di origine",
        },
        {
          key: "wcag",
          itemType: "text",
          text: "È dichiarata la conformità alle specifiche WCAG 2.1",
        },
      ];

      const items = [
        {
          result: auditData.redResult,
          link_name: "",
          link_destination: "",
          existing_page: "No",
          page_contains_correct_url: "",
          wcag: "",
        },
      ];

      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const accessibilityDeclarationElement = $("footer").find(
          '[data-element="accessibility-link"]'
      );
      const elementObj = $(accessibilityDeclarationElement).attr();
      items[0].link_name = accessibilityDeclarationElement.text().trim() ?? "";
      items[0].link_destination = elementObj?.href ?? "";

      if (
          elementObj &&
          "href" in elementObj &&
          elementObj.href !== "#" &&
          elementObj.href !== ""
      ) {
        const href = elementObj.href;
        const checkUrl = await urlExists(url, href);

        if (checkUrl.exception)
          throw new Error("Possibile errore del server AGID, verificare.");

        if (!checkUrl.result) {
          this.globalResults['score'] = 0;
          this.globalResults['details']['items'] = items;
          this.globalResults['details']['type'] = 'table';
          this.globalResults['details']['headings'] = this.headings;
          this.globalResults['details']['summary'] = '';

          return {
            score: 0,
          }
        }

        items[0].existing_page = "Sì";
        items[0].page_contains_correct_url = "No";
        items[0].wcag = "No";

        if (!href.includes("https://form.agid.gov.it/view/")) {
          this.globalResults['score'] = 0;
          this.globalResults['details']['items'] = items;
          this.globalResults['details']['type'] = 'table';
          this.globalResults['details']['headings'] = this.headings;
          this.globalResults['details']['summary'] = '';

          return {
            score: 0,
          };
        }

        const domain = new URL(url).host.replace(/^www./, "");

        const privacyPageHTML: string = await getAllPageHTML(href);
        if (!privacyPageHTML.match(new RegExp(domain, "i"))) {

          this.globalResults['score'] = 0;
          this.globalResults['details']['items'] = items;
          this.globalResults['details']['type'] = 'table';
          this.globalResults['details']['headings'] = this.headings;
          this.globalResults['details']['summary'] = '';

          return {
            score: 0,
          };
        }

        items[0].page_contains_correct_url = "Sì";

        if (
            !privacyPageHTML.match(/wcag 2.1/i) &&
            !privacyPageHTML.match(/wcag-21/i)
        ) {
          this.globalResults['score'] = 0;
          this.globalResults['details']['items'] = items;
          this.globalResults['details']['type'] = 'table';
          this.globalResults['details']['headings'] = this.headings;
          this.globalResults['details']['summary'] = '';

          return {
            score: 0,
          };
        } else {
          items[0].wcag = "Sì";
        }

        items[0].result = auditData.greenResult;
        this.score = 1;
      }

      this.globalResults['score'] = 0;
      this.globalResults['details']['items'] = items;
      this.globalResults['details']['type'] = 'table';
      this.globalResults['details']['headings'] = this.headings;
      this.globalResults['details']['summary'] = '';

      return {
        score: this.score,
      };
    }
  }

  async getType(){
    return auditId;
  }

  async returnGlobal(){
    return this.globalResults;
  }

  static getInstance(): Promise<AccAudit> {
    if (!AccAudit.instance) {
      AccAudit.instance = new AccAudit('',[],[]);
    }
    return AccAudit.instance;
  }

}

export {AccAudit};
export default AccAudit.getInstance;

