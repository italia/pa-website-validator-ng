"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {A11yAudit} from "../accessibility/index.js";

class MunicipalityA11yAudit extends A11yAudit {
  auditId = "municipality-legislation-accessibility-declaration-is-present";
  auditData = auditDictionary["municipality-legislation-accessibility-declaration-is-present"];

  static getInstance(): Promise<MunicipalityA11yAudit> {
    if (!MunicipalityA11yAudit.instance) {
      MunicipalityA11yAudit.instance = new MunicipalityA11yAudit('',[],[]);
    }
    return MunicipalityA11yAudit.instance;
  }

}

export {MunicipalityA11yAudit};
export default MunicipalityA11yAudit.getInstance;

