import { allowedFonts } from "./allowedFonts.js";
import { FontAudit } from "../font/index.js";
import * as ejs from "ejs";
import { __dirname, __basename } from "../esmHelpers.js";

class MunicipalityFontAudit extends FontAudit {
  auditId = "municipality-ux-ui-consistency-fonts-check";
  greenResult =
    "In tutte le pagine analizzate vengono utilizzati i font come richiesto.";
  yellowResult =
    "In almeno una delle pagine analizzate sono presenti <h> o <p> che includono altri font oltre a quelli richiesti.";
  redResult =
    "In almeno una delle pagine analizzate sono presenti <h> o <p> che non utilizzano i font come richiesto.";
  subItem = {
    greenResult:
      "Pagine analizzate nelle quali vengono utilizzati i font come richiesto:",
    yellowResult:
      "Pagine analizzate nelle quali sono presenti <h> o <p> che includono altri font oltre a quelli richiesti:",
    redResult:
      "Pagine analizzate nelle quali sono presenti <h> o <p> che non utilizzano i font come richiesto:",
  };
  title =
    "C.SI.1.1 - COERENZA DELL'UTILIZZO DEI FONT (librerie di caratteri) - Il sito comunale deve utilizzare i font indicati dalla documentazione del modello di sito comunale.";
  code = "C.SI.1.1";
  mainTitle = "COERENZA DELL'UTILIZZO DEI FONT (librerie di caratteri)";

  static allowedFonts = allowedFonts;

  static getInstance(): MunicipalityFontAudit {
    if (!MunicipalityFontAudit.instance) {
      MunicipalityFontAudit.instance = new MunicipalityFontAudit();
    }
    return <MunicipalityFontAudit>MunicipalityFontAudit.instance;
  }

  getFolderName(): string {
    return __basename;
  }
  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.score == 0.5) {
      status = "pass";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    return await ejs.renderFile(__dirname + "/municipality_font/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }
}

export { MunicipalityFontAudit };
export default MunicipalityFontAudit.getInstance;
