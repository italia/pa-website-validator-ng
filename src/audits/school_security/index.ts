"use strict";

import { SecurityAudit } from "../security/index.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class SchoolSecurityAudit extends SecurityAudit {
  auditId = "school-security";
  auditData = auditDictionary["school-security"];
  code = "C.SC.3.1";
  mainTitle = "CERTIFICATO HTTPS";

  static getInstance(): SchoolSecurityAudit {
    if (!SchoolSecurityAudit.instance) {
      SchoolSecurityAudit.instance = new SchoolSecurityAudit();
    }
    return <SchoolSecurityAudit>SchoolSecurityAudit.instance;
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

export { SchoolSecurityAudit };
export default SchoolSecurityAudit.getInstance;
