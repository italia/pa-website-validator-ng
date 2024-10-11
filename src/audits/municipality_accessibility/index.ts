"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {A11yAudit} from "../accessibility/index.js";
import * as ejs from "ejs";

class MunicipalityA11yAudit extends A11yAudit {
  auditId = "municipality-legislation-accessibility-declaration-is-present";
  auditData = auditDictionary["municipality-legislation-accessibility-declaration-is-present"];
  mainTitle = 'DICHIARAZIONE DI ACCESSIBILITÀ'
  code = "C.SI.3.2";

  async returnGlobalHTML() {
    let status = 'fail'
    let message = ''

    if (this.globalResults.score > 0.5) {
      status = 'pass';
      message = this.auditData.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = 'average';
      message = this.auditData.yellowResult
    } else {
      status = 'fail';
      message = this.auditData.redResult
    }

    const reportHtml = await ejs.renderFile('src/audits/municipality_accessibility/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults, status, statusMessage: message, metrics: null ,  totalPercentage : null });
    return reportHtml
  }

  static getInstance(): Promise<MunicipalityA11yAudit> {
    if (!MunicipalityA11yAudit.instance) {
      MunicipalityA11yAudit.instance = new MunicipalityA11yAudit('',[],[]);
    }
    return MunicipalityA11yAudit.instance;
  }

}

export {MunicipalityA11yAudit};
export default MunicipalityA11yAudit.getInstance;

