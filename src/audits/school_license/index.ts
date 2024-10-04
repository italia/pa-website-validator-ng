"use strict";

import {auditDictionary} from "../../storage/auditDictionary.js";
import {LicenceAudit} from "../license/index.js";

class SchoolLicenceAudit extends LicenceAudit {
    auditId = "school-license-and-attribution";
    auditData = auditDictionary["school-license-and-attribution"];

    static getInstance(): Promise<SchoolLicenceAudit> {
        if (!SchoolLicenceAudit.instance) {
            SchoolLicenceAudit.instance = new SchoolLicenceAudit('',[],[]);
        }
        return SchoolLicenceAudit.instance;
    }

}

export {SchoolLicenceAudit};
export default SchoolLicenceAudit.getInstance;

