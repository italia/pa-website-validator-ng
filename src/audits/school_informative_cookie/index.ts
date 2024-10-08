"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {InfoCookieDomain} from "../informative_cookie/index.js";

class SchoolInfoCookieDomain extends InfoCookieDomain {
  auditId = "school-informative-cookie-domain-check";
  auditData = auditDictionary["school-informative-cookie-domain-check"];

  static getInstance(): Promise<SchoolInfoCookieDomain> {
    if (!SchoolInfoCookieDomain.instance) {
      SchoolInfoCookieDomain.instance = new SchoolInfoCookieDomain('',[],[]);
    }
    return SchoolInfoCookieDomain.instance;
  }

}

export {SchoolInfoCookieDomain};
export default SchoolInfoCookieDomain.getInstance;
