"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoReuseAudit} from "../informative_reuse/index.js";

class SchoolInfoReuseAudit extends InfoReuseAudit {
  auditId = "school-informative-reuse";
  auditData = auditDictionary["school-informative-reuse"];

  static getInstance(): Promise<SchoolInfoReuseAudit> {
    if (!SchoolInfoReuseAudit.instance) {
      SchoolInfoReuseAudit.instance = new SchoolInfoReuseAudit('',[],[]);
    }
    return SchoolInfoReuseAudit.instance;
  }

}

export {SchoolInfoReuseAudit};
export default SchoolInfoReuseAudit.getInstance;
