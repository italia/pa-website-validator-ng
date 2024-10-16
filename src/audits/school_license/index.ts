"use strict";

import {auditDictionary} from "../../storage/auditDictionary.js";
import {LicenceAudit} from "../license/index.js";
import * as ejs from "ejs";
import path from "path";
import {fileURLToPath} from "url";

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

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

  return await ejs.renderFile(
        __dirname + "/template.ejs",
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

export { SchoolLicenceAudit };
export default SchoolLicenceAudit.getInstance;
