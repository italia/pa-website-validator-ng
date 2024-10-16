"use strict";

import {SecurityAudit} from "../security/index.js";
import {auditDictionary} from "../../storage/auditDictionary.js";
import * as ejs from "ejs";
import {fileURLToPath} from "url";
import path from "path";

class MunicipalitySecurityAudit extends SecurityAudit {
  auditId = "municipality-security";
  auditData = auditDictionary["municipality-security"];
  code = "C.SI.5.1";
  mainTitle = "CERTIFICATO HTTPS";

  static getInstance(): Promise<MunicipalitySecurityAudit> {
    if (!MunicipalitySecurityAudit.instance) {
      MunicipalitySecurityAudit.instance = new MunicipalitySecurityAudit(
        "",
        [],
        [],
      );
    }
    return MunicipalitySecurityAudit.instance;
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

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

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

export { MunicipalitySecurityAudit };
export default MunicipalitySecurityAudit.getInstance;
