"use strict";

import {SecurityAudit} from "../security/index.js";
import {auditDictionary} from "../../storage/auditDictionary.js";

class SchoolSecurityAudit extends SecurityAudit {
    auditId = "school-security";
    auditData = auditDictionary["school-security"];
    static getInstance(): Promise<SchoolSecurityAudit> {
        if (!SchoolSecurityAudit.instance) {
            SchoolSecurityAudit.instance = new SchoolSecurityAudit('',[],[]);
        }
        return SchoolSecurityAudit.instance;
    }
}

export {SchoolSecurityAudit};
export default SchoolSecurityAudit.getInstance;

