"use strict";

import { SecurityAudit } from "../security/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_security";

class SchoolSecurityAudit extends SecurityAudit {
  auditId = "school-security";
  greenResult = "Il certificato del sito [url] è attivo e valido.";
  yellowResult = "";
  redResult = "Il certificato del sito [url] non è attivo o valido: ";
  title =
    "C.SC.3.1 - CERTIFICATO HTTPS - Il sito della scuola deve avere un certificato https valido e attivo.";
  code = "C.SC.3.1";
  mainTitle = "CERTIFICATO HTTPS";

  static getInstance(): SchoolSecurityAudit {
    if (!SchoolSecurityAudit.instance) {
      SchoolSecurityAudit.instance = new SchoolSecurityAudit();
    }
    return <SchoolSecurityAudit>SchoolSecurityAudit.instance;
  }

  getFolderName(): string {
    return FOLDER_NAME;
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

    return await ejs.renderFile(__dirname + "/school_security/template.ejs", {
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
