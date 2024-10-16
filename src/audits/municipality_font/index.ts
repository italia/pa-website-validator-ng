import {auditDictionary} from "../../storage/auditDictionary.js";
import {allowedFonts} from "./allowedFonts.js";
import {FontAudit} from "../font/index.js";
import * as ejs from "ejs";
import {fileURLToPath} from "url";
import path from "path";

class MunicipalityFontAudit extends FontAudit {
  auditId = "municipality-ux-ui-consistency-fonts-check";
  auditData = auditDictionary["municipality-ux-ui-consistency-fonts-check"];
  code = "C.SI.1.1";
  mainTitle = "COERENZA DELL'UTILIZZO DEI FONT (librerie di caratteri)";

  static allowedFonts = allowedFonts;

  static getInstance(): Promise<MunicipalityFontAudit> {
    if (!MunicipalityFontAudit.instance) {
      MunicipalityFontAudit.instance = new MunicipalityFontAudit("", [], []);
    }
    return MunicipalityFontAudit.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.score == 0.5) {
      status = "average";
      message = this.auditData.yellowResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return await ejs.renderFile(
        __dirname + "/template.ejs",
        {
          ...(await this.meta()),
          code: this.code,
          table: this.globalResults,
          status,
          statusMessage: message,
          metrics: null,
          totalPercentage: null,
        },
    );
  }
}

export { MunicipalityFontAudit };
export default MunicipalityFontAudit.getInstance;
