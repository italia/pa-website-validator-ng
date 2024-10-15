"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { PrivacyAudit } from "../privacy/index.js";
import * as ejs from "ejs";

class SchoolPrivacyAudit extends PrivacyAudit {
  auditId = "school-legislation-privacy-is-present";
  auditData = auditDictionary["school-legislation-privacy-is-present"];
  code = "C.SC.2.1";
  mainTitle = "INFORMATIVA PRIVACY";

  static getInstance(): Promise<SchoolPrivacyAudit> {
    if (!SchoolPrivacyAudit.instance) {
      SchoolPrivacyAudit.instance = new SchoolPrivacyAudit("", [], []);
    }
    return SchoolPrivacyAudit.instance;
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
      "src/audits/school_privacy/template.ejs",
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

export { SchoolPrivacyAudit };
export default SchoolPrivacyAudit.getInstance;
