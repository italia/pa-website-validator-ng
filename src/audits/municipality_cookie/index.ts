import { CookieAudit } from "../cookie/index.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class MunicipalityCookie extends CookieAudit {
  auditId = "municipality-legislation-cookie-domain-check";
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
  code = "C.SI.3.1";
  mainTitle = "COOKIE";
  title =
    "C.SI.3.1 - COOKIE - Il sito comunale deve presentare cookie tecnici in linea con la normativa vigente.";

  static getInstance(): MunicipalityCookie {
    if (!MunicipalityCookie.instance) {
      MunicipalityCookie.instance = new MunicipalityCookie();
    }
    return <MunicipalityCookie>MunicipalityCookie.instance;
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

export { MunicipalityCookie };
export default MunicipalityCookie.getInstance;
