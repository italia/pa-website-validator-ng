import { auditDictionary } from "../../storage/auditDictionary.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit } from "../Audit.js";
import { Page } from "puppeteer";

const auditId = "school-ux-ui-consistency-bootstrap-italia-double-check";
const auditData = auditDictionary[auditId];
import { compareVersions } from "compare-versions";
import { cssClasses } from "./cssClasses.js";
import * as ejs from "ejs";

class SchoolBootstrap extends Audit {
  code = "C.SC.1.2";
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
  public correctItems: any = [];
  public pagesInError: any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings: any = [];

  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      mainTitle: this.mainTitle,
      code: this.code,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(page: Page | null, error?: string) {
    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: "",
        wrong_order_elements: "",
        missing_elements: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      this.titleSubHeadings = [
        "La libreria Bootstrap Italia è presente",
        "Versione in uso",
        "Classi CSS trovate",
      ];

      const subResults = ["Nessuna", "Almeno una"];

      this.headings = [
        {
          key: "result",
          itemType: "text",
          text: "Risultato totale",
          subItemsHeading: { key: "inspected_page", itemType: "url" },
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

      const url = page.url();

      let singleResult = 0;
      const item = {
        link: url,
        library_name: "No",
        library_version: "",
        classes_found: "",
      };

      const foundClasses = [];
      try {
        let bootstrapItaliaVariableVersion = (await page.evaluate(
          async function () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            return window.BOOTSTRAP_ITALIA_VERSION || null;
          },
        )) as string | null;

        if (bootstrapItaliaVariableVersion !== null)
          bootstrapItaliaVariableVersion = bootstrapItaliaVariableVersion
            .trim()
            .replaceAll('"', "");

        let bootstrapItaliaSelectorVariableVersion = (await page.evaluate(
          async function () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            return (
              getComputedStyle(document.body).getPropertyValue(
                "--bootstrap-italia-version",
              ) || null
            );
          },
        )) as string | null;

        if (bootstrapItaliaSelectorVariableVersion !== null)
          bootstrapItaliaSelectorVariableVersion =
            bootstrapItaliaSelectorVariableVersion.trim().replaceAll('"', "");

        if (
          bootstrapItaliaVariableVersion !== null &&
          bootstrapItaliaVariableVersion
        ) {
          item.library_version = bootstrapItaliaVariableVersion;
          item.library_name = "Sì";

          if (compareVersions(bootstrapItaliaVariableVersion, "1.6.0") >= 0) {
            singleResult = 1;
          }
        } else if (
          bootstrapItaliaSelectorVariableVersion !== null &&
          bootstrapItaliaSelectorVariableVersion
        ) {
          item.library_version = bootstrapItaliaSelectorVariableVersion;
          item.library_name = "Sì";

          if (
            compareVersions(bootstrapItaliaSelectorVariableVersion, "1.6.0") >=
            0
          ) {
            singleResult = 1;
          }
        }

        for (const cssClass of cssClasses) {
          const elementCount = await page.evaluate(async (cssClass) => {
            const cssElements = document.querySelectorAll(`.${cssClass}`);
            return cssElements.length;
          }, cssClass);

          if (elementCount > 0) {
            foundClasses.push(cssClass);
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

      if (foundClasses.length === 0) {
        singleResult = 0;
        item.classes_found = subResults[0];
      } else {
        item.classes_found = subResults[1];
      }

      if (singleResult === 1) {
        this.correctItems.push(item);
      } else {
        this.score = 0;
        this.wrongItems.push(item);
      }

      return {
        score: this.score,
      };
    }
  }

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    switch (this.score) {
      case 1:
        this.globalResults["details"]["items"].push({
          result: auditData.greenResult,
        });
        break;
      case 0:
        this.globalResults["details"]["items"].push({
          result: auditData.redResult,
        });
        break;
    }

    const results = [];

    if (this.pagesInError.length) {
      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_missing_elements: errorHandling.errorColumnTitles[1],
        title_wrong_order_elements: "",
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
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: auditData.subItem.redResult,
        title_library_name: this.titleSubHeadings[0],
        title_library_version: this.titleSubHeadings[1],
        title_classes_found: this.titleSubHeadings[2],
      });

      this.globalResults.wrongPages.headings = [
        auditData.subItem.redResult,
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

      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: auditData.subItem.greenResult,
        title_library_name: this.titleSubHeadings[0],
        title_library_version: this.titleSubHeadings[1],
        title_classes_found: this.titleSubHeadings[2],
      });

      this.globalResults.correctPages.headings = [
        auditData.subItem.greenResult,
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

    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.details.items = results;
    this.globalResults.details.headings = this.headings;
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

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
      "src/audits/school_bootstrap/template.ejs",
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

  static getInstance(): Promise<SchoolBootstrap> {
    if (!SchoolBootstrap.instance) {
      SchoolBootstrap.instance = new SchoolBootstrap("", [], []);
    }
    return SchoolBootstrap.instance;
  }
}

export { SchoolBootstrap };
export default SchoolBootstrap.getInstance;
