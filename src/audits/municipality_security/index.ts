"use strict";

import {SecurityAudit} from "../security/index.js";
import {auditDictionary} from "../../storage/auditDictionary.js";


class MunicipalitySecurityAudit extends SecurityAudit {
    static auditId = "municipality-security";
    static auditData = auditDictionary["municipality-security"];
    static getInstance(): Promise<MunicipalitySecurityAudit> {
        if (!MunicipalitySecurityAudit.instance) {
            MunicipalitySecurityAudit.instance = new MunicipalitySecurityAudit('',[],[]);
        }
        return MunicipalitySecurityAudit.instance;
    }

}

export {MunicipalitySecurityAudit};
export default MunicipalitySecurityAudit.getInstance;

