"use strict";

import {auditDictionary} from "../../storage/auditDictionary.js";
import {PrivacyAudit} from "../privacy/index.js";

class MunicipalityPrivacyAudit extends PrivacyAudit {
    static auditId = "municipality-legislation-privacy-is-present";
    static auditData = auditDictionary["municipality-legislation-privacy-is-present"];

    static getInstance(): Promise<MunicipalityPrivacyAudit> {
        if (!MunicipalityPrivacyAudit.instance) {
            MunicipalityPrivacyAudit.instance = new MunicipalityPrivacyAudit('',[],[]);
        }
        return MunicipalityPrivacyAudit.instance;
    }

}

export {MunicipalityPrivacyAudit};
export default MunicipalityPrivacyAudit.getInstance;

