"use strict";

import {ThemeAudit} from "../theme/index.js";
import {auditDictionary} from "../../storage/auditDictionary";

class MunicipalityThemeAudit extends ThemeAudit {
    static auditId = "municipality-ux-ui-consistency-theme-version-check";
    static auditData = auditDictionary["municipality-ux-ui-consistency-theme-version-check"];
    static minVersion = '1.0.0';
    static getInstance(): Promise<MunicipalityThemeAudit> {
        if (!MunicipalityThemeAudit.instance) {
            MunicipalityThemeAudit.instance = new MunicipalityThemeAudit('',[],[]);
        }
        return MunicipalityThemeAudit.instance;
    }

}

export {MunicipalityThemeAudit};
export default MunicipalityThemeAudit.getInstance;

