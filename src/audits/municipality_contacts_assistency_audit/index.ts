"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getPageElementDataAttribute, loadPageData } from "../../utils/utils.js";
import { CheerioAPI } from "cheerio";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { auditScanVariables } from "../../storage/municipality/auditScanVariables.js";
import {
  errorHandling,
  notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import { DataElementError } from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";

const auditId = "municipality-contacts-assistency";
const auditData = auditDictionary[auditId];

const accuracy = process.env["accuracy"] ?? "suggested";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const auditVariables = auditScanVariables[accuracy][auditId];

const numberOfServicesToBeScanned = process.env["numberOfServicePages"]
  ? JSON.parse(process.env["numberOfServicePages"])
  : auditVariables.numberOfServicesToBeScanned;

class ContactAssistencyAudit extends Audit {
  public globalResults: any = {
    score: 1,
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
  public score = 1;
  private titleSubHeadings: any = [];
  private headings : any = [];

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null
  ) {

    this.titleSubHeadings = [
      "La voce è presente nell'indice",
      "Il componente è presente in pagina",
    ];
    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato",
        subItemsHeading: {
          key: "inspected_page",
          itemType: "url",
        },
      },
      {
        key: "title_in_index",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "in_index",
          itemType: "text",
        },
      },
      {
        key: "title_component_exists",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "component_exists",
          itemType: "text",
        },
      },
    ];

    let url = '';
    if(page){
      try {
        url = page.url();
      } catch (ex) {
        if (!(ex instanceof DataElementError)) {
          throw ex;
        }

        this.globalResults.details.items = [{ key: "result", itemType: "text", text: "Risultato" }];
        this.globalResults.details.headings = [
          {
            result: notExecutedErrorMessage.replace("<LIST>", ex.message),
          },
        ];
        this.score = 0;

        return {
          score: 0,
        };
      }

      let $: CheerioAPI | any = null;

      try {
        let data = await page.content();
        $ = await cheerio.load(data);
      } catch (ex) {
        if (!(ex instanceof Error)) {
          throw ex;
        }

        let errorMessage = ex.message;
        errorMessage = errorMessage.substring(
            errorMessage.indexOf('"') + 1,
            errorMessage.lastIndexOf('"')
        );

        this.pagesInError.push({
          inspected_page: url,
          in_index: errorMessage,
        });
      }

      const item = {
        inspected_page: url,
        in_index: "No",
        component_exists: "No",
      };

      const indexList = await getPageElementDataAttribute(
          $,
          '[data-element="page-index"]',
          "> li > a"
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
      score: this.score
    }
  }

  async returnGlobal(){
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

      for (const item of this.pagesInError) {
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

      for (const item of this.wrongItems) {
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

      for (const item of this.correctItems) {
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
    this.globalResults.details.headings = this.headings;
    this.globalResults.errorMessage = this.pagesInError.length > 0 ? errorHandling.popupMessage : "";

    return this.globalResults;
  }

  static getInstance(): Promise<ContactAssistencyAudit> {
    if (!ContactAssistencyAudit.instance) {
      ContactAssistencyAudit.instance = new ContactAssistencyAudit('',[],[]);
    }
    return ContactAssistencyAudit.instance;
  }

}
