"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { A11yAudit } from "../accessibility/index.js";

class SchoolA11yAudit extends A11yAudit {
  static auditId = "school-legislation-accessibility-declaration-is-present";
  static auditData = auditDictionary["school-legislation-accessibility-declaration-is-present"];

  static getInstance(): Promise<SchoolA11yAudit> {
    if (!SchoolA11yAudit.instance) {
      SchoolA11yAudit.instance = new SchoolA11yAudit('',[],[]);
    }
    return SchoolA11yAudit.instance;
  }

}

export {SchoolA11yAudit};
export default SchoolA11yAudit.getInstance;

