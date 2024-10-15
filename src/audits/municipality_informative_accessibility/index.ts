"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { InformativeAccAudit } from "../informative_accessibility/index.js";

class MunicipalityInformativeAccAudit extends InformativeAccAudit {
  auditId =
    "municipality-informative-legislation-accessibility-declaration-is-present";
  auditData =
    auditDictionary[
      "municipality-informative-legislation-accessibility-declaration-is-present"
    ];

  code = "C.SI.3.2";
  mainTitle = "DICHIARAZIONE DI ACCESSIBILITÀ";

  static getInstance(): Promise<MunicipalityInformativeAccAudit> {
    if (!MunicipalityInformativeAccAudit.instance) {
      MunicipalityInformativeAccAudit.instance =
        new MunicipalityInformativeAccAudit("", [], []);
    }
    return MunicipalityInformativeAccAudit.instance;
  }
}

export { MunicipalityInformativeAccAudit };
export default MunicipalityInformativeAccAudit.getInstance;
