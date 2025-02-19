"use strict";

import { LicenceAudit } from "../license/index.js";
import * as ejs from "ejs";
import { __dirname } from "../esmHelpers.js";

const FOLDER_NAME = "school_license";

class SchoolLicenceAudit extends LicenceAudit {
  info = true;

  auditId = "school-license-and-attribution";
  greenResult =
    "La dicitura sulla licenza dei contenuti è presente nella pagina delle note legali raggiungibile dal footer.";
  yellowResult = "";
  redResult =
    "La dicitura sulla licenza dei contenuti è errata o non presente nella pagina delle note legali o questa non è raggiungibile dal footer.";
  title =
    "R.SC.2.2 - LICENZA E ATTRIBUZIONE - Il sito della scuola deve pubblicare dati, documenti e informazioni con licenza aperta (es. CC-BY 4.0).";
  code = "R.SC.2.2";
  mainTitle = "LICENZA E ATTRIBUZIONE";

  static getInstance(): SchoolLicenceAudit {
    if (!SchoolLicenceAudit.instance) {
      SchoolLicenceAudit.instance = new SchoolLicenceAudit();
    }
    return <SchoolLicenceAudit>SchoolLicenceAudit.instance;
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

export { SchoolLicenceAudit };
export default SchoolLicenceAudit.getInstance;
