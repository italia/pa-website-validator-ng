"use strict";

import {SecurityAudit} from "../security/index.js";
import {auditDictionary} from "../../storage/auditDictionary.js";


class MunicipalitySecurityAudit extends SecurityAudit {
    auditId = "municipality-security";
    auditData = auditDictionary["municipality-security"];
    static getInstance(): Promise<MunicipalitySecurityAudit> {
        if (!MunicipalitySecurityAudit.instance) {
            MunicipalitySecurityAudit.instance = new MunicipalitySecurityAudit('',[],[]);
        }
        return MunicipalitySecurityAudit.instance;
    }

}

export {MunicipalitySecurityAudit};
export default MunicipalitySecurityAudit.getInstance;

