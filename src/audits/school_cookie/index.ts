import { auditDictionary } from "../../storage/auditDictionary.js";
import { CookieAudit } from "../cookie/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolCookie extends CookieAudit {
  auditId = "school-legislation-cookie-domain-check";
  auditData = auditDictionary["school-legislation-cookie-domain-check"];
  code = "C.SC.2.3";
  mainTitle = "COOKIE";

  static getInstance(): Promise<SchoolCookie> {
    if (!SchoolCookie.instance) {
      SchoolCookie.instance = new SchoolCookie("", [], []);
    }
    return SchoolCookie.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
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

export { SchoolCookie };
export default SchoolCookie.getInstance;
