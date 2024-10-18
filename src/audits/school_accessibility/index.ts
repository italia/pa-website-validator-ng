"use strict";

import { A11yAudit } from "../accessibility/index.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class SchoolA11yAudit extends A11yAudit {
  code = "C.SC.2.2";
  mainTitle = "DICHIARAZIONE DI ACCESSIBILITÀ ";
  auditId = "school-legislation-accessibility-declaration-is-present";
  greenResult = "Il link è nel footer e invia alla pagina corretta.";
  yellowResult = "";
  redResult =
    "Il link non è nel footer o non invia alla pagina corretta o la pagina non esiste.";
  nonExecuted =
    "Uno o più data-element necessari per condurre il test non sono stati trovati. Verifica il capitolo sui Requisiti tecnici nella Documentazione delle App di valutazione per risolvere il problema.";
  title =
    "C.SC.2.2 - © - Il sito della scuola deve esporre la dichiarazione di accessibilità.";
  
  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = "average";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): SchoolA11yAudit {
    if (!SchoolA11yAudit.instance) {
      SchoolA11yAudit.instance = new SchoolA11yAudit();
    }
    return <SchoolA11yAudit>SchoolA11yAudit.instance;
  }
}

export { SchoolA11yAudit };
export default SchoolA11yAudit.getInstance;
