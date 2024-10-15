"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { LicenceAudit } from "../license/index.js";
import * as ejs from "ejs";

class SchoolLicenceAudit extends LicenceAudit {
  auditId = "school-license-and-attribution";
  auditData = auditDictionary["school-license-and-attribution"];
  code = "R.SC.2.2";
  mainTitle = "LICENZA E ATTRIBUZIONE";

  static getInstance(): Promise<SchoolLicenceAudit> {
    if (!SchoolLicenceAudit.instance) {
      SchoolLicenceAudit.instance = new SchoolLicenceAudit("", [], []);
    }
    return SchoolLicenceAudit.instance;
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
      "src/audits/school_license/template.ejs",
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

export { SchoolLicenceAudit };
export default SchoolLicenceAudit.getInstance;
