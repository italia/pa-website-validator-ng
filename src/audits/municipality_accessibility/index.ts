"use strict";

import { A11yAudit } from "../accessibility/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

class MunicipalityA11yAudit extends A11yAudit {
  auditId = "municipality-legislation-accessibility-declaration-is-present";
  greenResult =
    "Il link è nel footer, invia alla pagina corretta e contiene l'URL corretto.";
  yellowResult = "";
  redResult =
    "Il link non è nel footer o non invia alla pagina corretta o la pagina non esiste.";
  mainTitle = "DICHIARAZIONE DI ACCESSIBILITÀ";
  code = "C.SI.3.2";
  title =
    "C.SI.3.2 - DICHIARAZIONE DI ACCESSIBILITÀ - Il sito comunale deve esporre la dichiarazione di accessibilità in conformità al modello e alle linee guida rese disponibili da AgID in ottemperanza alla normativa vigente in materia di accessibilità e con livelli di accessibilità contemplati nelle specifiche tecniche WCAG 2.1.";

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

    return await ejs.renderFile(
      __dirname + "/municipality_accessibility/template.ejs",
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
  }

  getFolderName(): string {
    return "municipality_accessibility";
  }

  static getInstance(): MunicipalityA11yAudit {
    if (!MunicipalityA11yAudit.instance) {
      MunicipalityA11yAudit.instance = new MunicipalityA11yAudit();
    }
    return <MunicipalityA11yAudit>MunicipalityA11yAudit.instance;
  }
}

export { MunicipalityA11yAudit };
export default MunicipalityA11yAudit.getInstance;
