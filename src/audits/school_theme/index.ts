"use strict";

import {ThemeAudit} from "../theme/index.js";
import {auditDictionary} from "../../storage/auditDictionary.js";

class SchoolThemeAudit extends ThemeAudit {
    static auditId = "school-ux-ui-consistency-theme-version-check";
    static auditData = auditDictionary["school-ux-ui-consistency-theme-version-check"];
    static minVersion = '2.0.0';
    static getInstance(): Promise<SchoolThemeAudit> {
        if (!SchoolThemeAudit.instance) {
            SchoolThemeAudit.instance = new SchoolThemeAudit('',[],[]);
        }
        return SchoolThemeAudit.instance;
    }

}

export {SchoolThemeAudit};
export default SchoolThemeAudit.getInstance;

