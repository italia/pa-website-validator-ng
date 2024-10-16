"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {auditDictionary} from "../../storage/auditDictionary.js";
import {InfoCloudAudit} from "../informative_cloud_infrastructure/index.js";
import * as ejs from "ejs";
import path from "path";
import {fileURLToPath} from "url";

class SchoolInfoCloudAudit extends InfoCloudAudit {
  auditId = "school-informative-cloud-infrastructure";
  auditData = auditDictionary["school-informative-cloud-infrastructure"];
  mainTitle = "INFRASTRUTTURE CLOUD";
  code = "R.SC.2.3";

  static getInstance(): Promise<SchoolInfoCloudAudit> {
    if (!SchoolInfoCloudAudit.instance) {
      SchoolInfoCloudAudit.instance = new SchoolInfoCloudAudit("", [], []);
    }
    return SchoolInfoCloudAudit.instance;
  }

  async returnGlobalHTML() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(
        __dirname + "/template.ejs",
        {...(await this.meta()), code: this.code, table: this.globalResults},
    );
  }
}

export { SchoolInfoCloudAudit };
export default SchoolInfoCloudAudit.getInstance;
