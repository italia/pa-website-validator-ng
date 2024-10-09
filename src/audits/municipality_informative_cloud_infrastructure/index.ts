"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoCloudAudit} from "../informative_cloud_infrastructure/index.js";

class MunicipalityInfoCloudAudit extends InfoCloudAudit {
  auditId = "municipality-informative-cloud-infrastructure";
  auditData = auditDictionary["municipality-informative-cloud-infrastructure"];

  static getInstance(): Promise<MunicipalityInfoCloudAudit> {
    if (!MunicipalityInfoCloudAudit.instance) {
      MunicipalityInfoCloudAudit.instance = new MunicipalityInfoCloudAudit('',[],[]);
    }
    return MunicipalityInfoCloudAudit.instance;
  }

}

export {MunicipalityInfoCloudAudit};
export default MunicipalityInfoCloudAudit.getInstance;
