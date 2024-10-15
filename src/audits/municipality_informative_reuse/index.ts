"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InfoReuseAudit } from "../informative_reuse/index.js";
import * as ejs from "ejs";

class MunicipalityInfoReuseAudit extends InfoReuseAudit {
  auditId = "municipality-informative-reuse";
  auditData = auditDictionary["municipality-informative-reuse"];
  mainTitle = "RIUSO";
  code = "R.SI.2.2";

  static getInstance(): Promise<MunicipalityInfoReuseAudit> {
    if (!MunicipalityInfoReuseAudit.instance) {
      MunicipalityInfoReuseAudit.instance = new MunicipalityInfoReuseAudit(
        "",
        [],
        [],
      );
    }
    return MunicipalityInfoReuseAudit.instance;
  }

  async returnGlobalHTML() {
    const reportHtml = await ejs.renderFile(
      "src/audits/municipality_informative_reuse/template.ejs",
      { ...(await this.meta()), code: this.code, table: this.globalResults },
    );
    return reportHtml;
  }
}

export { MunicipalityInfoReuseAudit };
export default MunicipalityInfoReuseAudit.getInstance;
