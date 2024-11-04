import { CookieAudit } from "../cookie/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolCookie extends CookieAudit {
  auditId = "school-legislation-cookie-domain-check";
  code = "C.SC.2.3";
  mainTitle = "COOKIE";
  greenResult =
    "In tutte le pagine analizzate sono stati rilevati solo cookie idonei.";
  yellowResult = "";
  redResult =
    "In almeno una delle pagine analizzate sono stati rilevati cookie non idonei.";
  subItem = {
    greenResult: "Pagine nelle quali sono stati rilevati solo cookie idonei:",
    yellowResult: "",
    redResult: "Pagine nelle quali sono stati rilevati cookie non idonei:",
  };
  title =
    "C.SC.2.3 - COOKIE - Il sito della scuola deve presentare cookie tecnici in linea con la normativa vigente.";

  static getInstance(): SchoolCookie {
    if (!SchoolCookie.instance) {
      SchoolCookie.instance = new SchoolCookie();
    }
    return <SchoolCookie>SchoolCookie.instance;
  }

  getFolderName(): string {
    return path.basename(path.dirname(fileURLToPath(import.meta.url)));
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.greenResult;
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

export { SchoolCookie };
export default SchoolCookie.getInstance;
