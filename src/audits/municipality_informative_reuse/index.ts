"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

import { InfoReuseAudit } from "../informative_reuse/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class MunicipalityInfoReuseAudit extends InfoReuseAudit {
  auditId = "municipality-informative-reuse";
  mainTitle = "RIUSO";
  code = "R.SI.2.2";
  title =
    "R.SI.2.2 - RIUSO - Il Comune deve mettere a riuso sotto licenza aperta il software secondo le Linee Guida “acquisizione e riuso di software e riuso di software per le pubbliche amministrazioni";

  static getInstance(): MunicipalityInfoReuseAudit {
    if (!MunicipalityInfoReuseAudit.instance) {
      MunicipalityInfoReuseAudit.instance = new MunicipalityInfoReuseAudit();
    }
    return <MunicipalityInfoReuseAudit>MunicipalityInfoReuseAudit.instance;
  }

  getFolderName(): string {
    return path.basename(path.dirname(fileURLToPath(import.meta.url)));
  }

  async returnGlobalHTML() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
    });
  }
}

export { MunicipalityInfoReuseAudit };
export default MunicipalityInfoReuseAudit.getInstance;
