"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { compareVersions } from "compare-versions";
import { isDrupal } from "../../utils/municipality/utils.js";
import { cssClasses, drupalCoreClasses } from "./cssClasses.js";
import { Page } from "puppeteer";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";
import { redirectUrlIsInternal } from "../../utils/utils.js";

const FOLDER_NAME = "municipality_bootstrap";

class BootstrapMunAudit extends Audit {
  auditId = "municipality-ux-ui-consistency-bootstrap-italia-double-check";
  code = "C.SI.1.2";
  mainTitle = "LIBRERIA DI ELEMENTI DI INTERFACCIA";
  title =
    "C.SI.1.2 - LIBRERIA DI ELEMENTI DI INTERFACCIA - Il sito comunale deve utilizzare la libreria Bootstrap Italia.";
  greenResult =
    "In tutte le pagine analizzate la libreria Bootstrap Italia è presente in una versione idonea ed è in uso come richiesto.";
  yellowResult = "";
  redResult =
    "In almeno una delle pagine analizzate la libreria Bootstrap Italia non è presente, o non è in uso come richiesto o ne viene utilizzata una versione datata.";
  subItem = {
    greenResult:
      "Pagine che utilizzano la libreria in una versione idonea e nelle quali almeno il 30% delle classi CSS uniche appartiene a Bootstrap Italia:",
    yellowResult: "",
    redResult:
      "Pagine che non utilizzano la libreria in una versione idonea o nelle quali meno del 30% delle classi CSS uniche appartiene a Bootstrap Italia:",
  };

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
  private subResults: string[] = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  getFolderName(): string {
    return FOLDER_NAME;
  }

  async auditPage(page: Page, url: string) {
    if (!(await redirectUrlIsInternal(page))) {
      return;
    }

    this.titleSubHeadings = [
      "La libreria Bootstrap Italia è presente",
      "Versione in uso",
      "Classi CSS uniche appartenenti a BI",
    ];

    this.subResults = ["Nessuna classe CSS trovata"];

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
          compareVersions(bootstrapItaliaSelectorVariableVersion, "2.0.0") >= 0
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

      this.wrongItems.push({
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

    return {
      score: this.score,
    };
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        this.subItem.redResult,
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
        this.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.score = this.score;
    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    return await ejs.renderFile(__dirname + `/${FOLDER_NAME}/template.ejs`, {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  async getType() {
    return this.auditId;
  }

  static getInstance(): BootstrapMunAudit {
    if (!BootstrapMunAudit.instance) {
      BootstrapMunAudit.instance = new BootstrapMunAudit();
    }
    return <BootstrapMunAudit>BootstrapMunAudit.instance;
  }
}

export { BootstrapMunAudit };
export default BootstrapMunAudit.getInstance;
