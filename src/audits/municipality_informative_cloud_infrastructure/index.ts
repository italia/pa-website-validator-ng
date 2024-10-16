"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InfoCloudAudit } from "../informative_cloud_infrastructure/index.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class MunicipalityInfoCloudAudit extends InfoCloudAudit {
  auditId = "municipality-informative-cloud-infrastructure";
  auditData = auditDictionary["municipality-informative-cloud-infrastructure"];
  mainTitle = "INFRASTRUTTURE CLOUD";
  code = "R.SI.2.1";

  static getInstance(): Promise<MunicipalityInfoCloudAudit> {
    if (!MunicipalityInfoCloudAudit.instance) {
      MunicipalityInfoCloudAudit.instance = new MunicipalityInfoCloudAudit(
        "",
        [],
        [],
      );
    }
    return MunicipalityInfoCloudAudit.instance;
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

export { MunicipalityInfoCloudAudit };
export default MunicipalityInfoCloudAudit.getInstance;
