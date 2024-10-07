"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  checkFeedbackComponent,
} from "../../utils/municipality/utils.js";
import {
  errorHandling,
} from "../../config/commonAuditsParts.js";

import {Page} from "puppeteer";
import {Audit} from "../Audit.js";

const auditId = "municipality-feedback-element";
const auditData = auditDictionary[auditId];

class FeedbackAudit extends Audit {
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
  private wrongItems: any = [];
  private toleranceItems: any = [];
  private correctItems: any = [];
  private pagesInError : any = [];
  private score = 1;
  private titleSubHeadings: any = [];
  private headings : any = [];

  async meta() {
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

    this.titleSubHeadings = ["Elementi errati o non trovati"];
    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato totale",
        subItemsHeading: { key: "inspected_page", itemType: "url" },
      },
      {
        key: "title_errors_found",
        itemType: "text",
        text: "",
        subItemsHeading: { key: "errors_found", itemType: "text" },
      },
    ];

    if(error && !page){
      this.score = 0;

      this.pagesInError.push({
        inspected_page: '',
        errors_found: error,
      });

      return {
        score: 0,
      }
    }

    if(page){
      let url = page.url();

        const item = {
          inspected_page: url,
          errors_found: "",
        };
        try {
          const feedbackComponentAnalysis = await checkFeedbackComponent(
              url
          );

          if (this.score > feedbackComponentAnalysis.score) {
            this.score = feedbackComponentAnalysis.score;
          }

          if (feedbackComponentAnalysis.errors.length > 0) {
            item.errors_found = feedbackComponentAnalysis.errors.join("; ");
          }
          switch (feedbackComponentAnalysis.score) {
            case 0:
              this.wrongItems.push(item);
              break;
            case 0.5:
              this.toleranceItems.push(item);
              break;
            case 1:
              this.correctItems.push(item);
              break;
          }
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
            errors_found: errorMessage,
          });
        }

      return {
        score: this.score > 0 ? 1 : 0,
      };
    }


  }

  async getType(){
    return auditId;
  }

  async returnGlobal(){
    if(this.globalResults['score'] > 0){
      this.globalResults['score'] = 1;
    }

    const results = [];

    if (this.pagesInError.length > 0) {
      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_errors_found: errorHandling.errorColumnTitles[1],
      });

      for (const item of this.pagesInError) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }
    }else {

      switch (this.score) {
        case 1:
          results.push({
            result: auditData.greenResult,
          });
          break;
        case 0.5:
          results.push({
            result: auditData.yellowResult,
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
        title_errors_found: this.titleSubHeadings[0],
      });

      for (const item of this.wrongItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }
    }

    if (this.toleranceItems.length > 0) {
      results.push({
        result: auditData.subItem.yellowResult,
        title_errors_found: this.titleSubHeadings[0],
      });

      for (const item of this.toleranceItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: auditData.subItem.greenResult,
        title_errors_found: this.titleSubHeadings[0],
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

    this.globalResults['score'] = this.score;
    this.globalResults['ils']['items'].push(results);
    this.globalResults['errorMessage'] = this.pagesInError.length || this.wrongItems.length ? errorHandling.popupMessage : "";
    this.globalResults['details']['headings'] = this.headings;

    return this.globalResults;
  }

  static getInstance(): Promise<FeedbackAudit> {
    if (!FeedbackAudit.instance) {
      FeedbackAudit.instance = new FeedbackAudit('',[],[]);
    }
    return FeedbackAudit.instance;
  }

}

export {FeedbackAudit};
export default FeedbackAudit.getInstance;
