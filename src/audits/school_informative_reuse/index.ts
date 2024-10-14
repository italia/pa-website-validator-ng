"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoReuseAudit} from "../informative_reuse/index.js";
import * as ejs from "ejs";

class SchoolInfoReuseAudit extends InfoReuseAudit {
  auditId = "school-informative-reuse";
  auditData = auditDictionary["school-informative-reuse"];
  mainTitle = 'RIUSO';
  code = "R.SC.2.1";

  static getInstance(): Promise<SchoolInfoReuseAudit> {
    if (!SchoolInfoReuseAudit.instance) {
      SchoolInfoReuseAudit.instance = new SchoolInfoReuseAudit('',[],[]);
    }
    return SchoolInfoReuseAudit.instance;
  }

  async returnGlobalHTML() {
    const reportHtml = await ejs.renderFile('src/audits/school_informative_reuse/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults });
    return reportHtml
  }

}

export {SchoolInfoReuseAudit};
export default SchoolInfoReuseAudit.getInstance;
