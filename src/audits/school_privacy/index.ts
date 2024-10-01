"use strict";

import {auditDictionary} from "../../storage/auditDictionary.js";
import {PrivacyAudit} from "../privacy/index.js";

class SchoolPrivacyAudit extends PrivacyAudit {
    static auditId = "school-legislation-privacy-is-present";
    static auditData = auditDictionary["school-legislation-privacy-is-present"];

    static getInstance(): Promise<SchoolPrivacyAudit> {
        if (!SchoolPrivacyAudit.instance) {
            SchoolPrivacyAudit.instance = new SchoolPrivacyAudit('',[],[]);
        }
        return SchoolPrivacyAudit.instance;
    }

}

export {SchoolPrivacyAudit};
export default SchoolPrivacyAudit.getInstance;

