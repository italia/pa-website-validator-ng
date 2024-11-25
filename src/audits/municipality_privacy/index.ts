"use strict";

import { PrivacyAudit } from "../privacy/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "municipality_privacy";

class MunicipalityPrivacyAudit extends PrivacyAudit {
  auditId = "municipality-legislation-privacy-is-present";
  greenResult = "Il link è nel footer e invia a una pagina esistente e sicura.";
  redResult =
    "Il link non è nel footer o non invia a una pagina esistente o sicura.";
  dataElementResult =
    "Non è stato trovato il data-element 'privacy-policy-link'";
  code = "C.SI.3.3";
  mainTitle = "INFORMATIVA PRIVACY";
  title =
    "C.SI.3.3 - INFORMATIVA PRIVACY - Il sito comunale deve presentare l'informativa sul trattamento dei dati personali, secondo quanto previsto dalla normativa vigente.";

  static getInstance(): MunicipalityPrivacyAudit {
    if (!MunicipalityPrivacyAudit.instance) {
      MunicipalityPrivacyAudit.instance = new MunicipalityPrivacyAudit();
    }
    return <MunicipalityPrivacyAudit>MunicipalityPrivacyAudit.instance;
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

export { MunicipalityPrivacyAudit };
export default MunicipalityPrivacyAudit.getInstance;
