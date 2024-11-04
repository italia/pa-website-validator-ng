"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { InfoCloudAudit } from "../informative_cloud_infrastructure/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolInfoCloudAudit extends InfoCloudAudit {
  auditId = "school-informative-cloud-infrastructure";
  title =
    "R.SC.2.3 - INFRASTRUTTURE CLOUD - Il sito della scuola deve essere ospitato su infrastrutture qualificate ai sensi della normativa vigente.";
  mainTitle = "INFRASTRUTTURE CLOUD";
  code = "R.SC.2.3";

  static getInstance(): SchoolInfoCloudAudit {
    if (!SchoolInfoCloudAudit.instance) {
      SchoolInfoCloudAudit.instance = new SchoolInfoCloudAudit();
    }
    return <SchoolInfoCloudAudit>SchoolInfoCloudAudit.instance;
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

export { SchoolInfoCloudAudit };
export default SchoolInfoCloudAudit.getInstance;
