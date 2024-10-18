import { allowedFonts } from "./allowedFonts.js";
import { FontAudit } from "../font/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolFontAudit extends FontAudit {
  auditId = "school-ux-ui-consistency-fonts-check";
  greenResult = "In tutte le pagine analizzate vengono utilizzati i font come richiesto.";
  yellowResult = "In almeno una delle pagine analizzate sono presenti <h> o <p> che includono altri font oltre a quelli richiesti.";
  redResult = "In almeno una delle pagine analizzate sono presenti <h> o <p> che non utilizzano i font come richiesto.";
  subItem = {
      greenResult:
        "Pagine analizzate nelle quali vengono utilizzati i font come richiesto:",
      yellowResult:
        "Pagine analizzate nelle quali sono presenti <h> o <p> che includono altri font oltre a quelli richiesti:",
      redResult:
        "Pagine analizzate nelle quali sono presenti <h> o <p> che non utilizzano i font come richiesto:",
    };
  title = "C.SC.1.1 - COERENZA DELL'UTILIZZO DEI FONT (librerie di caratteri) - Il sito della scuola deve utilizzare i font indicati dalla documentazione del modello di sito della scuola.";
  code = "C.SC.1.1";
  mainTitle = "COERENZA DELL'UTILIZZO DEI FONT (librerie di caratteri)";

  static allowedFonts = allowedFonts;

  static getInstance(): SchoolFontAudit {
    if (!SchoolFontAudit.instance) {
      SchoolFontAudit.instance = new SchoolFontAudit();
    }
    return <SchoolFontAudit>SchoolFontAudit.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else if (this.score == 0.5) {
      status = "average";
      message = this.yellowResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
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

export { SchoolFontAudit };
export default SchoolFontAudit.getInstance;
