"use strict";

import { SecurityAudit } from "../security/index.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import * as ejs from "ejs";

class SchoolSecurityAudit extends SecurityAudit {
  auditId = "school-security";
  auditData = auditDictionary["school-security"];
  code = "C.SC.3.1";
  mainTitle = "CERTIFICATO HTTPS";

  static getInstance(): Promise<SchoolSecurityAudit> {
    if (!SchoolSecurityAudit.instance) {
      SchoolSecurityAudit.instance = new SchoolSecurityAudit("", [], []);
    }
    return SchoolSecurityAudit.instance;
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
      "src/audits/school_security/template.ejs",
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

export { SchoolSecurityAudit };
export default SchoolSecurityAudit.getInstance;
