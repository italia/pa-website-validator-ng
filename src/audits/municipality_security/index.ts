"use strict";

import { SecurityAudit } from "../security/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

class MunicipalitySecurityAudit extends SecurityAudit {
  auditId = "municipality-security";
  greenResult = "Il certificato del sito [url] è attivo e valido.";
  redResult = "Il certificato del sito [url] non è attivo o valido: ";
  code = "C.SI.5.1";
  mainTitle = "CERTIFICATO HTTPS";
  title =
    "C.SI.5.1 - CERTIFICATO HTTPS - Il sito comunale deve avere un certificato https valido e attivo.";

  static getInstance(): MunicipalitySecurityAudit {
    if (!MunicipalitySecurityAudit.instance) {
      MunicipalitySecurityAudit.instance = new MunicipalitySecurityAudit();
    }
    return <MunicipalitySecurityAudit>MunicipalitySecurityAudit.instance;
  }

  getFolderName(): string {
    return "municipality_security";
  }
  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.greenResult.replace("[url]", this.url);
    } else {
      status = "fail";
      message = this.redResult.replace("[url]", this.url);
    }

    return await ejs.renderFile(
      __dirname + "/municipality_security/template.ejs",
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
}

export { MunicipalitySecurityAudit };
export default MunicipalitySecurityAudit.getInstance;
