"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  checkFeedbackComponent,
} from "../../utils/municipality/utils.js";
import {
  errorHandling,
} from "../../config/commonAuditsParts.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as ejs from "ejs";

const auditId = "municipality-user-experience-evaluation";
const auditData = auditDictionary[auditId];

class UserExperienceEvaluationAudit extends Audit {
  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    pagesInError: {
      message: '',
      headings: [],
      pages: []
    },
    wrongPages: {
      message: '',
      headings: [],
      pages: []
    },
    tolerancePages: {
      message: '',
      headings: [],
      pages: []
    },
    correctPages: {
      message: '',
      headings: [],
      pages: []
    },
    errorMessage: ''
  };

  code = 'C.SI.2.6'
  mainTitle = 'VALUTAZIONE DELL’ESPERIENZA D’USO, CHIAREZZA INFORMATIVA DELLA SCHEDA DI SERVIZIO'

  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError : any = [];
  public score = 1;
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
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: auditId,
    };
  }

  async auditPage(
   page: Page | null,
   url:string, 
   error?: string
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

    if (error && !page) {

      this.score = 0;

      this.pagesInError.push({
        link: '',
        errors_found: error,
      });

      return {
        score: 0,
      }
    }

    if(page){
      let url = page.url();

      const item = {
        link: url,
        errors_found: "",
      };
      try {
        const feedbackComponentAnalysis = await checkFeedbackComponent(
            url,
            page
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
          link: url,
          errors_found: errorMessage,
        });
      }
    }

    return {
      score: this.score > 0 ? 1 : 0,
    };
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.tolerancePages.pages = [];
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
        title_errors_found: errorHandling.errorColumnTitles[1],
      });

      this.globalResults.pagesInError.message = errorHandling.errorMessage
      this.globalResults.pagesInError.headings = [errorHandling.errorColumnTitles[0], errorHandling.errorColumnTitles[1]];

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
      this.globalResults.wrongPages.headings = [auditData.subItem.redResult, this.titleSubHeadings[0]];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
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
      
      this.globalResults.tolerancePages.headings = [auditData.subItem.yellowResult, this.titleSubHeadings[0]]

      for (const item of this.toleranceItems) {
        this.globalResults.tolerancePages.pages.push(item);
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
      
      this.globalResults.correctPages.headings = [auditData.subItem.greenResult, this.titleSubHeadings[0]];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item)
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

  async returnGlobalHTML() {
    let status = 'fail'
    let message = ''

    if (this.score > 0.5) {
        status = 'pass';
        message = this.auditData.greenResult;
    } else if (this.score == 0.5) {
        status = 'average';
        message = this.auditData.yellowResult
    } else {
        status = 'fail';
        message = this.auditData.redResult
    }

    const reportHtml = await ejs.renderFile('src/audits/municipality_user_experience_evaluation/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults, status, statusMessage: message, metrics: null ,  totalPercentage : null });
    return reportHtml
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
