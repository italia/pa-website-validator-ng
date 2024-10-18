"use strict";


import { LicenceAudit } from "../license/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class MunicipalityLicenceAudit extends LicenceAudit {
  auditId = "municipality-license-and-attribution";
  greenResult = "La dicitura sulla licenza dei contenuti è presente nella pagina delle note legali raggiungibile dal footer.";
  redResult = "La dicitura sulla licenza dei contenuti è errata o non presente nella pagina delle note legali o questa non è raggiungibile dal footer.";
  code = "C.SI.3.4";
  mainTitle = "LICENZA E ATTRIBUZIONE";
  title = "C.SI.3.4 - LICENZA E ATTRIBUZIONE - Il sito comunale deve pubblicare dati, documenti e informazioni con licenza aperta comunicandolo come descritto nella documentazione del modello di sito comunale."

  static getInstance(): MunicipalityLicenceAudit {
    if (!MunicipalityLicenceAudit.instance) {
      MunicipalityLicenceAudit.instance = new MunicipalityLicenceAudit();
    }
    return <MunicipalityLicenceAudit>MunicipalityLicenceAudit.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
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

export { MunicipalityLicenceAudit };
export default MunicipalityLicenceAudit.getInstance;
