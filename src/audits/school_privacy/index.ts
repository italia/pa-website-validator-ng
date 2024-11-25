"use strict";

import { PrivacyAudit } from "../privacy/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_privacy";

class SchoolPrivacyAudit extends PrivacyAudit {
  auditId = "school-legislation-privacy-is-present";
  greenResult = "Il link è nel footer e invia a una pagina esistente e sicura.";
  dataElementResult =
    "Non è stato trovato il data-element 'privacy-policy-link'";
  yellowResult = "";
  redResult =
    "Il link non è nel footer o non invia a una pagina esistente o sicura.";
  title =
    "C.SC.2.1 - INFORMATIVA PRIVACY - Il sito della scuola deve presentare l'informativa sul trattamento dei dati personali, secondo quanto previsto dalla normativa vigente.";
  code = "C.SC.2.1";
  mainTitle = "INFORMATIVA PRIVACY";

  static getInstance(): SchoolPrivacyAudit {
    if (!SchoolPrivacyAudit.instance) {
      SchoolPrivacyAudit.instance = new SchoolPrivacyAudit();
    }
    return <SchoolPrivacyAudit>SchoolPrivacyAudit.instance;
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
    } else if (this.globalResults.intermediateMessage) {
      status = "fail";
      message = this.dataElementResult;
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

export { SchoolPrivacyAudit };
export default SchoolPrivacyAudit.getInstance;
