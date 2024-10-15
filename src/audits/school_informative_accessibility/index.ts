"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InformativeAccAudit } from "../informative_accessibility/index.js";

class SchoolInformativeAccAudit extends InformativeAccAudit {
  auditId =
    "school-informative-legislation-accessibility-declaration-is-present";
  auditData =
    auditDictionary[
      "school-informative-legislation-accessibility-declaration-is-present"
    ];

  static getInstance(): Promise<SchoolInformativeAccAudit> {
    if (!SchoolInformativeAccAudit.instance) {
      SchoolInformativeAccAudit.instance = new SchoolInformativeAccAudit(
        "",
        [],
        [],
      );
    }
    return SchoolInformativeAccAudit.instance;
  }
}

export { SchoolInformativeAccAudit };
export default SchoolInformativeAccAudit.getInstance;
