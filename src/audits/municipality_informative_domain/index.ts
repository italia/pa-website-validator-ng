"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InfoDomainAudit } from "../informative_domain/index.js";

class MunicipalityInfoDomainAudit extends InfoDomainAudit {
  auditId = "municipality-informative-domain";
  auditData = auditDictionary["municipality-informative-domain"];

  static getInstance(): Promise<MunicipalityInfoDomainAudit> {
    if (!MunicipalityInfoDomainAudit.instance) {
      MunicipalityInfoDomainAudit.instance = new MunicipalityInfoDomainAudit(
        "",
        [],
        [],
      );
    }
    return MunicipalityInfoDomainAudit.instance;
  }
}

export { MunicipalityInfoDomainAudit };
export default MunicipalityInfoDomainAudit.getInstance;
