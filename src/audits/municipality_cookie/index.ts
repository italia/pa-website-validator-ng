import {auditDictionary} from "../../storage/auditDictionary.js";
import {CookieAudit} from "../cookie/index.js";

class MunicipalityCookie extends CookieAudit {
    auditId = "school-legislation-cookie-domain-check";
    auditData = auditDictionary["school-legislation-cookie-domain-check"];

    static getInstance(): Promise<MunicipalityCookie> {
        if (!MunicipalityCookie.instance) {
            MunicipalityCookie.instance = new MunicipalityCookie('', [], []);
        }
        return MunicipalityCookie.instance;
    }
}


export {MunicipalityCookie};
export default MunicipalityCookie.getInstance;
