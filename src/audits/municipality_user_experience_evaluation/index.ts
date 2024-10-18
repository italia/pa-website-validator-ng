"use strict";

import { checkFeedbackComponent } from "../../utils/municipality/utils.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import {Audit, GlobalResultsMulti} from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const auditId = "municipality-user-experience-evaluation";
const code = "C.SI.2.6";
const mainTitle =
    "VALUTAZIONE DELL’ESPERIENZA D’USO, CHIAREZZA INFORMATIVA DELLA SCHEDA DI SERVIZIO";
const greenResult =
    "In tutte le pagine analizzate il componente è presente e rispetta le caratteristiche richieste.";
const yellowResult =
    "In tutte le pagine analizzate il componente è presente ma potrebbe non rispettare tutte le caratteristiche richieste.";
const redResult =
    "In almeno una delle pagine analizzate il componente non è presente o non rispetta le caratteristiche richieste.";
const subItem = {
    greenResult:
      "Pagine nelle quali il componente è presente e rispetta le caratteristiche richieste:",
    yellowResult:
      "Pagine nelle quali il componente è presente ma potrebbe non rispettare tutte le caratteristiche richieste:",
    redResult:
      "Pagine nelle quali il componente non è presente o non rispetta le caratteristiche richieste:",
};
const title = "C.SI.2.6 - VALUTAZIONE DELL’ESPERIENZA D’USO, CHIAREZZA INFORMATIVA DELLA SCHEDA DI SERVIZIO - Il sito comunale deve permettere la valutazione della chiarezza informativa per ogni scheda di servizio secondo le modalità indicate nella documentazione del modello di sito comunale.";    

class UserExperienceEvaluationAudit extends Audit {
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
    tolerancePages: {
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
  public toleranceItems: Record<string, unknown>[] = [];
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
    this.titleSubHeadings = ["Elementi errati o non trovati"];

    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        errors_found: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      const item = {
        link: url,
        errors_found: "",
      };
      try {
        const feedbackComponentAnalysis = await checkFeedbackComponent(
          url,
          page,
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
          errorMessage.lastIndexOf('"'),
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
    this.globalResults.correctPages.pages = []
    if(this.globalResults.tolerancePages){
      this.globalResults.tolerancePages.pages = [];
    }
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
        case 0.5:
          results.push({
            result: yellowResult,
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
        title_errors_found: this.titleSubHeadings[0],
      });
      this.globalResults.wrongPages.headings = [
        subItem.redResult,
        this.titleSubHeadings[0],
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
    }

    if (this.toleranceItems.length > 0) {
      results.push({
        result: subItem.yellowResult,
        title_errors_found: this.titleSubHeadings[0],
      });

      if(this.globalResults.tolerancePages){
        this.globalResults.tolerancePages.headings = [
          subItem.yellowResult,
          this.titleSubHeadings[0],
        ];

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

    }

    if (this.correctItems.length > 0) {
      results.push({
        result: subItem.greenResult,
        title_errors_found: this.titleSubHeadings[0],
      });

      this.globalResults.correctPages.headings = [
        subItem.greenResult,
        this.titleSubHeadings[0],
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

    this.globalResults.details.items = results;
    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.score = this.score;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = greenResult;
    } else if (this.score == 0.5) {
      status = "average";
      message = yellowResult;
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

  static getInstance(): UserExperienceEvaluationAudit {
    if (!UserExperienceEvaluationAudit.instance) {
      UserExperienceEvaluationAudit.instance =
        new UserExperienceEvaluationAudit();
    }
    return <UserExperienceEvaluationAudit>UserExperienceEvaluationAudit.instance;
  }

  async getType() {
    return auditId;
  }
}

export { UserExperienceEvaluationAudit };
export default UserExperienceEvaluationAudit.getInstance;
