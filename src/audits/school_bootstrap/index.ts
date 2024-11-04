import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page } from "puppeteer";
import { compareVersions } from "compare-versions";
import { cssClasses } from "./cssClasses.js";
import * as ejs from "ejs";
import { __dirname, __basename } from "../esmHelpers.js";

const auditId = "school-ux-ui-consistency-bootstrap-italia-double-check";
const greenResult =
  "In tutte le pagine analizzate la libreria Bootstrap Italia è presente e in uso in una versione idonea.";
const redResult =
  "In almeno una delle pagine analizzate la libreria Bootstrap Italia non è presente, o non è in uso o ne viene utilizzata una versione datata.";
const subItem = {
  greenResult:
    "Pagine che utilizzano la libreria Bootstrap Italia in una versione idonea e utilizzano almeno una delle classi CSS indicate: ",
  yellowResult: "",
  redResult:
    "Pagine che non utilizzano la libreria Bootstrap Italia in una versione idonea o non utilizzano nessuna delle classi CSS indicate: ",
};
const title =
  "C.SC.1.2 - LIBRERIA DI ELEMENTI DI INTERFACCIA - Il sito della scuola deve utilizzare la libreria Bootstrap Italia in una versione più recente di 1.6.";
const code = "C.SC.1.2";
const mainTitle = "LIBRERIA DI ELEMENTI DI INTERFACCIA";

class SchoolBootstrap extends Audit {
  public globalResults: GlobalResultsMulti = {
    score: 1,
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

  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  async meta() {
    return {
      id: auditId,
      title: title,
      mainTitle: mainTitle,
      code: code,
      auditId: auditId,
    };
  }

  getFolderName(): string {
    return __basename;
  }

  async auditPage(page: Page, url: string) {
    this.titleSubHeadings = [
      "La libreria Bootstrap Italia è presente",
      "Versione in uso",
      "Classi CSS trovate",
    ];

    const subResults = ["Nessuna", "Almeno una"];

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
          compareVersions(bootstrapItaliaSelectorVariableVersion, "1.6.0") >= 0
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

      this.wrongItems.push({
        link: url,
        library_name: ex.message,
        library_version: "",
        classes_found: "",
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

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
      }
    }

    if (this.correctItems.length > 0) {
      this.globalResults.correctPages.headings = [
        subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = greenResult;
    } else {
      status = "fail";
      message = redResult;
    }

    return await ejs.renderFile(__dirname + "/school_bootstrap/template.ejs", {
      ...(await this.meta()),
      code: code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): SchoolBootstrap {
    if (!SchoolBootstrap.instance) {
      SchoolBootstrap.instance = new SchoolBootstrap();
    }
    return <SchoolBootstrap>SchoolBootstrap.instance;
  }
}

export { SchoolBootstrap };
export default SchoolBootstrap.getInstance;
