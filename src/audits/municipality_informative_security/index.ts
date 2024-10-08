"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoSecurityAudit} from "../informative_security/index.js";

class MunicipalityInfoSecurityAudit extends InfoSecurityAudit {
  auditId = "municipality-informative-security";
  auditData = auditDictionary["municipality-informative-security"];

  static getInstance(): Promise<MunicipalityInfoSecurityAudit> {
    if (!MunicipalityInfoSecurityAudit.instance) {
      MunicipalityInfoSecurityAudit.instance = new MunicipalityInfoSecurityAudit('',[],[]);
    }
    return MunicipalityInfoSecurityAudit.instance;
  }

}

export {MunicipalityInfoSecurityAudit};
export default MunicipalityInfoSecurityAudit.getInstance;
