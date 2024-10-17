"use strict";

import { ThemeAudit } from "../theme/index.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolThemeAudit extends ThemeAudit {
  auditId = "school-ux-ui-consistency-theme-version-check";
  auditData = auditDictionary["school-ux-ui-consistency-theme-version-check"];
  minVersion = "2.0.0";
  code = "C.SI.1.4";
  mainTitle = "UTILIZZO DI TEMI PER CMS";

  static getInstance(): SchoolThemeAudit {
    if (!SchoolThemeAudit.instance) {
      SchoolThemeAudit.instance = new SchoolThemeAudit();
    }
    return <SchoolThemeAudit>SchoolThemeAudit.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = "average";
      message = this.auditData.yellowResult;
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

export { SchoolThemeAudit };
export default SchoolThemeAudit.getInstance;
