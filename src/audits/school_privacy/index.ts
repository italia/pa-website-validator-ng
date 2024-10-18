"use strict";

import { PrivacyAudit } from "../privacy/index.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class SchoolPrivacyAudit extends PrivacyAudit {
  auditId = "school-legislation-privacy-is-present";
  greenResult = "Il link è nel footer e invia a una pagina esistente e sicura.";
  yellowResult = "";
  redResult = "Il link non è nel footer o non invia a una pagina esistente o sicura.";
  title = "C.SC.2.1 - INFORMATIVA PRIVACY - Il sito della scuola deve presentare l'informativa sul trattamento dei dati personali, secondo quanto previsto dalla normativa vigente.";
  code = "C.SC.2.1";
  mainTitle = "INFORMATIVA PRIVACY";

  static getInstance(): SchoolPrivacyAudit {
    if (!SchoolPrivacyAudit.instance) {
      SchoolPrivacyAudit.instance = new SchoolPrivacyAudit();
    }
    return <SchoolPrivacyAudit>SchoolPrivacyAudit.instance;
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
}

export { SchoolPrivacyAudit };
export default SchoolPrivacyAudit.getInstance;
