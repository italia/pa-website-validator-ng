"use strict";

import { ThemeAudit } from "../theme/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_theme";

class SchoolThemeAudit extends ThemeAudit {
  auditId = "school-ux-ui-consistency-theme-version-check";
  greenResult =
    "Il sito utilizza una versione uguale o superiore alla 2.0 del tema CMS del modello.";
  yellowResult = "Il sito non utilizza il tema CMS del modello.";
  redResult =
    "Il sito non utilizza una versione uguale o superiore alla 2.0 del tema CMS del modello.";
  title =
    "C.SC.1.3 - UTILIZZO DI TEMI PER CMS - Nel caso in cui il sito utilizzi un tema messo a disposizione nella documentazione del modello di sito della scuola, lo utilizza nella versione 2.0 o successive.";
  minVersion = "2.0.0";
  code = "C.SC.1.3";
  mainTitle = "UTILIZZO DI TEMI PER CMS";

  static getInstance(): SchoolThemeAudit {
    if (!SchoolThemeAudit.instance) {
      SchoolThemeAudit.instance = new SchoolThemeAudit();
    }
    return <SchoolThemeAudit>SchoolThemeAudit.instance;
  }

  getFolderName(): string {
    return FOLDER_NAME;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = "pass";
      message = this.yellowResult;
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
}

export { SchoolThemeAudit };
export default SchoolThemeAudit.getInstance;
