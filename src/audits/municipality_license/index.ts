"use strict";

import {auditDictionary} from "../../storage/auditDictionary.js";
import {LicenceAudit} from "../license/index.js";

class MunicipalityLicenceAudit extends LicenceAudit {
    static auditId = "municipality-license-and-attribution";
    static auditData = auditDictionary["municipality-license-and-attribution"];

    static getInstance(): Promise<MunicipalityLicenceAudit> {
        if (!MunicipalityLicenceAudit.instance) {
            MunicipalityLicenceAudit.instance = new MunicipalityLicenceAudit('',[],[]);
        }
        return MunicipalityLicenceAudit.instance;
    }

}

export {MunicipalityLicenceAudit};
export default MunicipalityLicenceAudit.getInstance;

