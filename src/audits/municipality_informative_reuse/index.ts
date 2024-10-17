"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InfoReuseAudit } from "../informative_reuse/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class MunicipalityInfoReuseAudit extends InfoReuseAudit {
  auditId = "municipality-informative-reuse";
  auditData = auditDictionary["municipality-informative-reuse"];
  mainTitle = "RIUSO";
  code = "R.SI.2.2";

  static getInstance(): MunicipalityInfoReuseAudit {
    if (!MunicipalityInfoReuseAudit.instance) {
      MunicipalityInfoReuseAudit.instance = new MunicipalityInfoReuseAudit();
    }
    return <MunicipalityInfoReuseAudit>MunicipalityInfoReuseAudit.instance;
  }

  async returnGlobalHTML() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
    });
  }
}

export { MunicipalityInfoReuseAudit };
export default MunicipalityInfoReuseAudit.getInstance;
