"use strict";

import { ThemeAudit } from "../theme/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "municipality_theme";

class MunicipalityThemeAudit extends ThemeAudit {
  auditId = "municipality-ux-ui-consistency-theme-version-check";
  greenResult =
    "Il sito utilizza una versione uguale o superiore alla 1.0 del tema CMS del modello.";
  yellowResult = "Il sito non utilizza il tema CMS del modello.";
  redResult =
    "Il sito non utilizza una versione uguale o superiore alla 1.0 del tema CMS del modello.";
  code = "C.SI.1.4";
  mainTitle = "UTILIZZO DI TEMI PER CMS";
  title =
    "C.SI.1.4 - UTILIZZO DI TEMI PER CMS - Nel caso in cui il sito utilizzi un tema messo a disposizione nella documentazione del modello di sito comunale, lo utilizza nella versione 1.0 o successive.";

  minVersion = "1.0.0";
  static getInstance(): MunicipalityThemeAudit {
    if (!MunicipalityThemeAudit.instance) {
      MunicipalityThemeAudit.instance = new MunicipalityThemeAudit();
    }
    return <MunicipalityThemeAudit>MunicipalityThemeAudit.instance;
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

export { MunicipalityThemeAudit };
export default MunicipalityThemeAudit.getInstance;
