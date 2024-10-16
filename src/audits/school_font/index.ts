import { auditDictionary } from "../../storage/auditDictionary.js";
import { allowedFonts } from "./allowedFonts.js";
import { FontAudit } from "../font/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolFontAudit extends FontAudit {
  auditId = "school-ux-ui-consistency-fonts-check";
  auditData = auditDictionary["school-ux-ui-consistency-fonts-check"];
  code = "C.SC.1.1";
  mainTitle = "COERENZA DELL'UTILIZZO DEI FONT (librerie di caratteri)";

  static allowedFonts = allowedFonts;

  static getInstance(): Promise<SchoolFontAudit> {
    if (!SchoolFontAudit.instance) {
      SchoolFontAudit.instance = new SchoolFontAudit("", [], []);
    }
    return SchoolFontAudit.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.score == 0.5) {
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

export { SchoolFontAudit };
export default SchoolFontAudit.getInstance;
