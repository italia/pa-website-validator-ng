import {auditDictionary} from "../../storage/auditDictionary.js";
import {CookieAudit} from "../cookie/index.js";

class SchoolCookie extends CookieAudit {
    static auditId = "school-legislation-cookie-domain-check";
    static auditData = auditDictionary["school-legislation-cookie-domain-check"];

    static getInstance(): Promise<SchoolCookie> {
        if (!SchoolCookie.instance) {
            SchoolCookie.instance = new SchoolCookie('', [], []);
        }
        return SchoolCookie.instance;
    }
}


export {SchoolCookie};
export default SchoolCookie.getInstance;
