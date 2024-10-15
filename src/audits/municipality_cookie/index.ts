import { auditDictionary } from "../../storage/auditDictionary.js";
import { CookieAudit } from "../cookie/index.js";
import * as ejs from "ejs";

class MunicipalityCookie extends CookieAudit {
  auditId = "municipality-legislation-cookie-domain-check";
  auditData = auditDictionary["municipality-legislation-cookie-domain-check"];
  code = "C.SI.3.1";
  mainTitle = "COOKIE";

  static getInstance(): Promise<MunicipalityCookie> {
    if (!MunicipalityCookie.instance) {
      MunicipalityCookie.instance = new MunicipalityCookie("", [], []);
    }
    return MunicipalityCookie.instance;
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

    const reportHtml = await ejs.renderFile(
      "src/audits/municipality_cookie/template.ejs",
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

export { MunicipalityCookie };
export default MunicipalityCookie.getInstance;
