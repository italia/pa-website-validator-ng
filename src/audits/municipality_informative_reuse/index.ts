"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoReuseAudit} from "../informative_reuse/index.js";

class MunicipalityInfoReuseAudit extends InfoReuseAudit {
  auditId = "municipality-informative-reuse";
  auditData = auditDictionary["municipality-informative-reuse"];

  static getInstance(): Promise<MunicipalityInfoReuseAudit> {
    if (!MunicipalityInfoReuseAudit.instance) {
      MunicipalityInfoReuseAudit.instance = new MunicipalityInfoReuseAudit('',[],[]);
    }
    return MunicipalityInfoReuseAudit.instance;
  }

}

export {MunicipalityInfoReuseAudit};
export default MunicipalityInfoReuseAudit.getInstance;
