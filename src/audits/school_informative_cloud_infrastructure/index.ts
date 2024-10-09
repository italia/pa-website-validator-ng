"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoCloudAudit} from "../informative_cloud_infrastructure/index.js";

class SchoolInfoCloudAudit extends InfoCloudAudit {
  auditId = "school-informative-cloud-infrastructure";
  auditData = auditDictionary["school-informative-cloud-infrastructure"];

  static getInstance(): Promise<SchoolInfoCloudAudit> {
    if (!SchoolInfoCloudAudit.instance) {
      SchoolInfoCloudAudit.instance = new SchoolInfoCloudAudit('',[],[]);
    }
    return SchoolInfoCloudAudit.instance;
  }

}

export {SchoolInfoCloudAudit};
export default SchoolInfoCloudAudit.getInstance;
