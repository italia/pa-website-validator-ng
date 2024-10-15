"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import { InfoCookieDomain } from "../informative_cookie/index.js";

class MunicipalityInfoCookieDomain extends InfoCookieDomain {
  auditId = "municipality-informative-cookie-domain-check";
  auditData = auditDictionary["municipality-informative-cookie-domain-check"];

  static getInstance(): Promise<MunicipalityInfoCookieDomain> {
    if (!MunicipalityInfoCookieDomain.instance) {
      MunicipalityInfoCookieDomain.instance = new MunicipalityInfoCookieDomain(
        "",
        [],
        [],
      );
    }
    return MunicipalityInfoCookieDomain.instance;
  }
}

export { MunicipalityInfoCookieDomain };
export default MunicipalityInfoCookieDomain.getInstance;
