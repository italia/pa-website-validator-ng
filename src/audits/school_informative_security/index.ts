"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InfoSecurityAudit } from "../informative_security/index.js";

class SchoolInfoSecurityAudit extends InfoSecurityAudit {
  auditId = "school-informative-security";
  auditData = auditDictionary["school-informative-security"];

  static getInstance(): Promise<SchoolInfoSecurityAudit> {
    if (!SchoolInfoSecurityAudit.instance) {
      SchoolInfoSecurityAudit.instance = new SchoolInfoSecurityAudit(
        "",
        [],
        [],
      );
    }
    return SchoolInfoSecurityAudit.instance;
  }
}

export { SchoolInfoSecurityAudit };
export default SchoolInfoSecurityAudit.getInstance;
