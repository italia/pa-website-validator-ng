"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

import { InfoCloudAudit } from "../informative_cloud_infrastructure/index.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class MunicipalityInfoCloudAudit extends InfoCloudAudit {
  auditId = "municipality-informative-cloud-infrastructure";
  mainTitle = "INFRASTRUTTURE CLOUD";
  code = "R.SI.2.1";
  title = "R.SI.2.1 - INFRASTRUTTURE CLOUD - Il sito comunale deve essere ospitato su infrastrutture qualificate ai sensi della normativa vigente";

  static getInstance(): MunicipalityInfoCloudAudit {
    if (!MunicipalityInfoCloudAudit.instance) {
      MunicipalityInfoCloudAudit.instance = new MunicipalityInfoCloudAudit();
    }
    return <MunicipalityInfoCloudAudit>MunicipalityInfoCloudAudit.instance;
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
