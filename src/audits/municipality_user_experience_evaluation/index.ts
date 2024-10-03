"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  checkFeedbackComponent,
} from "../../utils/municipality/utils.js";
import {
  errorHandling,
  notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";

const auditId = "municipality-user-experience-evaluation";
const auditData = auditDictionary[auditId];
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

class UserExperienceEvaluationAudit extends Audit {
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
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
   page: Page | null,
   error?: string
  ) {

    if (error && !page) {

      this.globalResults['score'] = 0;
      this.globalResults['details']['items'] =  [
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ];
      this.globalResults['details']['type'] = 'table';
      this.globalResults['details']['headings'] = [{key: "result", itemType: "text", text: "Risultato"}];
      this.globalResults['details']['summary'] = '';

      return {
        score: 0,
      }
    }

    if(page){
      let url = page.url();

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
    }

    return {
      score: this.score > 0 ? 1 : 0,
    };
  }

  async returnGlobal() {

    if(this.globalResults.details.items.length){
      this.globalResults.details.items.unshift({
        result: (this.constructor as typeof Audit).auditData.redResult,
      })
      return this.globalResults;
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
    } else {
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

    this.globalResults.details.headings = this.headings;
    this.globalResults.details.items = results;
    this.globalResults.errorMessage = this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.score = this.score;

    return this.globalResults
  }

  static getInstance(): Promise<UserExperienceEvaluationAudit> {
    if (!UserExperienceEvaluationAudit.instance) {
      UserExperienceEvaluationAudit.instance = new UserExperienceEvaluationAudit('',[],[]);
    }
    return UserExperienceEvaluationAudit.instance;
  }

  async getType(){
    return auditId;
  }

}

export { UserExperienceEvaluationAudit };
export default UserExperienceEvaluationAudit.getInstance;
