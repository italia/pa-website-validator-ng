"use strict";

import {auditDictionary} from "../../storage/auditDictionary.js";
import {PrivacyAudit} from "../privacy/index.js";
import * as ejs from "ejs";

class MunicipalityPrivacyAudit extends PrivacyAudit {
    auditId = "municipality-legislation-privacy-is-present";
    auditData = auditDictionary["municipality-legislation-privacy-is-present"];
    code = 'C.SI.3.3'
    mainTitle = 'INFORMATIVA PRIVACY'

    static getInstance(): Promise<MunicipalityPrivacyAudit> {
        if (!MunicipalityPrivacyAudit.instance) {
            MunicipalityPrivacyAudit.instance = new MunicipalityPrivacyAudit('',[],[]);
        }
        return MunicipalityPrivacyAudit.instance;
    }

    async returnGlobalHTML() {
        let status = 'fail'
        let message = ''

        if (this.globalResults.score > 0.5) {
            status = 'pass';
            message = this.auditData.greenResult;
        } else {
            status = 'fail';
            message = this.auditData.redResult
        }

        const reportHtml = await ejs.renderFile('src/audits/municipality_privacy/template.ejs', { ...await this.meta(), code: this.code, table: this.globalResults, status, statusMessage: message, metrics: null ,  totalPercentage : null });
        return reportHtml
    }

}

export {MunicipalityPrivacyAudit};
export default MunicipalityPrivacyAudit.getInstance;

