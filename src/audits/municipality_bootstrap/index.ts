"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { compareVersions } from "compare-versions";
import { auditDictionary } from "../../storage/auditDictionary.js";
import { isDrupal } from "../../utils/municipality/utils.js";
import { cssClasses, drupalCoreClasses } from "./cssClasses.js";
import { Page } from "puppeteer";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit } from "../Audit.js";
import * as ejs from "ejs";

class BootstrapMunAudit extends Audit {
  auditId = "municipality-ux-ui-consistency-bootstrap-italia-double-check";
  auditData =
    auditDictionary[
      "municipality-ux-ui-consistency-bootstrap-italia-double-check"
    ];
  code = "C.SI.1.2";
  mainTitle = "LIBRERIA DI ELEMENTI DI INTERFACCIA";

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: "table",
      headings: [],
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
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError: any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings: any = [];
  private subResults: any = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    this.titleSubHeadings = [
      "La libreria Bootstrap Italia è presente",
      "Versione in uso",
      "Classi CSS uniche appartenenti a BI",
    ];

    this.subResults = ["Nessuna classe CSS trovata"];

    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato totale",
        subItemsHeading: { key: "link", itemType: "url" },
      },
      {
        key: "title_library_name",
        itemType: "text",
        text: "",
        subItemsHeading: { key: "library_name", itemType: "text" },
      },
      {
        key: "title_library_version",
        itemType: "text",
        text: "",
        subItemsHeading: { key: "library_version", itemType: "text" },
      },
      {
        key: "title_classes_found",
        itemType: "text",
        text: "",
        subItemsHeading: { key: "classes_found", itemType: "text" },
      },
    ];

    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        library_name: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      const drupalClassesCheck = await isDrupal(url);

      let singleResult = 0;
      const item = {
        link: url,
        library_name: "No",
        library_version: "",
        classes_found: "",
      };

      try {
        let bootstrapItaliaVariableVersion = await page.evaluate(
          async function () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            return window.BOOTSTRAP_ITALIA_VERSION || null;
          },
        );

        if (bootstrapItaliaVariableVersion !== null)
          bootstrapItaliaVariableVersion = bootstrapItaliaVariableVersion
            .trim()
            .replaceAll('"', "");

        let bootstrapItaliaSelectorVariableVersion = await page.evaluate(
          async function () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            return (
              getComputedStyle(document.body).getPropertyValue(
                "--bootstrap-italia-version",
              ) || null
            );
          },
        );

        if (bootstrapItaliaSelectorVariableVersion !== null)
          bootstrapItaliaSelectorVariableVersion =
            bootstrapItaliaSelectorVariableVersion.trim().replaceAll('"', "");

        if (
          bootstrapItaliaVariableVersion !== null &&
          bootstrapItaliaVariableVersion
        ) {
          item.library_version = bootstrapItaliaVariableVersion;
          item.library_name = "Sì";

          if (compareVersions(bootstrapItaliaVariableVersion, "2.0.0") >= 0) {
            singleResult = 1;
          }
        } else if (
          bootstrapItaliaSelectorVariableVersion !== null &&
          bootstrapItaliaSelectorVariableVersion
        ) {
          item.library_version = bootstrapItaliaSelectorVariableVersion;
          item.library_name = "Sì";

          if (
            compareVersions(bootstrapItaliaSelectorVariableVersion, "2.0.0") >=
            0
          ) {
            singleResult = 1;
          }
        }

        const foundClasses = await page.evaluate(async () => {
          const used = new Set<string>();
          const elements = document.getElementsByTagName("*");
          for (const element of elements) {
            const elementClasses = element.getAttribute("class") ?? "";
            for (const cssClass of elementClasses.split(" ")) {
              if (cssClass) {
                used.add(cssClass);
              }
            }
          }
          return [...used];
        });

        if (foundClasses.length === 0) {
          singleResult = 0;
          item.classes_found = this.subResults[0];
        } else {
          const correctClasses = [];
          const baseClasses = [];
          for (const cssClass of foundClasses) {
            if (cssClasses.includes(cssClass)) {
              correctClasses.push(cssClass);
            }

            if (!drupalClassesCheck) {
              baseClasses.push(cssClass);
            } else {
              if (!drupalCoreClasses.some((rx) => rx.test(cssClass))) {
                baseClasses.push(cssClass);
              }
            }
          }

          const percentage = Math.round(
            (correctClasses.length / baseClasses.length) * 100,
          );
          item.classes_found = percentage + "%";
          if (percentage < 30) {
            singleResult = 0;
          }
        }
      } catch (ex) {
        console.error(`ERROR ${url}: ${ex}`);
        if (!(ex instanceof Error)) {
          throw ex;
        }

        this.pagesInError.push({
          link: url,
          library_name: ex.message,
        });
      }

      if (singleResult === 1) {
        this.correctItems.push(item);
      } else {
        this.score = 0;
        this.wrongItems.push(item);
      }
    }

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
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
        title_library_name: errorHandling.errorColumnTitles[1],
        title_library_version: "",
        title_classes_found: "",
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
            result: this.auditData.greenResult,
          });
          break;
        case 0:
          results.push({
            result: this.auditData.redResult,
          });
          break;
      }
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: this.auditData.subItem.redResult,
        title_library_name: this.titleSubHeadings[0],
        title_library_version: this.titleSubHeadings[1],
        title_classes_found: this.titleSubHeadings[2],
      });
      this.globalResults.wrongPages.headings = [
        this.auditData.subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
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

    if (this.correctItems.length > 0) {
      results.push({
        result: this.auditData.subItem.greenResult,
        title_library_name: this.titleSubHeadings[0],
        title_library_version: this.titleSubHeadings[1],
        title_classes_found: this.titleSubHeadings[2],
      });

      this.globalResults.correctPages.headings = [
        this.auditData.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
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
    this.globalResults.details.headings = this.headings;
    this.globalResults.score = this.score;
    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const reportHtml = await ejs.renderFile(
      "src/audits/municipality_bootstrap/template.ejs",
      {
        ...(await this.meta()),
        code: this.code,
        table: this.globalResults,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
    return reportHtml;
  }

  async getType() {
    return this.auditId;
  }

  static getInstance(): Promise<BootstrapMunAudit> {
    if (!BootstrapMunAudit.instance) {
      BootstrapMunAudit.instance = new BootstrapMunAudit("", [], []);
    }
    return BootstrapMunAudit.instance;
  }
}

export { BootstrapMunAudit };
export default BootstrapMunAudit.getInstance;
