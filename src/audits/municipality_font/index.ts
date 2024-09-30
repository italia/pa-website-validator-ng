import {auditDictionary} from "../../storage/auditDictionary.js";
import { allowedFonts } from './allowedFonts.js'
import { FontAudit } from "../font/index.js";

class MunicipalityFontAudit extends FontAudit {
    static auditId = "municipality-ux-ui-consistency-fonts-check";
    static auditData = auditDictionary["municipality-ux-ui-consistency-fonts-check"];

    static allowedFonts = allowedFonts;

    static getInstance(): Promise<MunicipalityFontAudit> {
        if (!MunicipalityFontAudit.instance) {
            MunicipalityFontAudit.instance = new MunicipalityFontAudit('', [], []);
        }
        return MunicipalityFontAudit.instance;
    }
}


export {MunicipalityFontAudit};
export default MunicipalityFontAudit.getInstance;
