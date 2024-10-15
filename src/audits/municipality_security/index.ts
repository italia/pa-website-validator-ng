"use strict";

import { SecurityAudit } from "../security/index.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import * as ejs from "ejs";

class MunicipalitySecurityAudit extends SecurityAudit {
  auditId = "municipality-security";
  auditData = auditDictionary["municipality-security"];
  code = "C.SI.5.1";
  mainTitle = "CERTIFICATO HTTPS";

  static getInstance(): Promise<MunicipalitySecurityAudit> {
    if (!MunicipalitySecurityAudit.instance) {
      MunicipalitySecurityAudit.instance = new MunicipalitySecurityAudit(
        "",
        [],
        [],
      );
    }
    return MunicipalitySecurityAudit.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const reportHtml = await ejs.renderFile(
      "src/audits/municipality_security/template.ejs",
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
    return reportHtml;
  }
}

export { MunicipalitySecurityAudit };
export default MunicipalitySecurityAudit.getInstance;
