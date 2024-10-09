import {auditDictionary} from "../../storage/auditDictionary.js";
import { allowedFonts } from './allowedFonts.js'
import { FontAudit } from "../font/index.js";

class SchoolFontAudit extends FontAudit {
    auditId = "school-ux-ui-consistency-fonts-check";
    auditData = auditDictionary["school-ux-ui-consistency-fonts-check"];

    static allowedFonts = allowedFonts;

    static getInstance(): Promise<SchoolFontAudit> {
        if (!SchoolFontAudit.instance) {
            SchoolFontAudit.instance = new SchoolFontAudit('', [], []);
        }
        return SchoolFontAudit.instance;
    }
}


export {SchoolFontAudit};
export default SchoolFontAudit.getInstance;
