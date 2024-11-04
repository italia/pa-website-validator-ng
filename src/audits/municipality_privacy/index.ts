"use strict";

import { PrivacyAudit } from "../privacy/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class MunicipalityPrivacyAudit extends PrivacyAudit {
  auditId = "municipality-legislation-privacy-is-present";
  greenResult = "Il link è nel footer e invia a una pagina esistente e sicura.";
  redResult =
    "Il link non è nel footer o non invia a una pagina esistente o sicura.";
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

export { MunicipalityPrivacyAudit };
export default MunicipalityPrivacyAudit.getInstance;
