"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

import { InfoReuseAudit } from "../informative_reuse/index.js";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

class SchoolInfoReuseAudit extends InfoReuseAudit {
  auditId = "school-informative-reuse";
  title =
    "R.SC.2.1 - RIUSO - La scuola deve mettere a riuso sotto licenza aperta il software secondo le Linee Guida “acquisizione e riuso di software e riuso di software per le pubbliche amministrazioni“.";
  mainTitle = "RIUSO";
  code = "R.SC.2.1";

  static getInstance(): SchoolInfoReuseAudit {
    if (!SchoolInfoReuseAudit.instance) {
      SchoolInfoReuseAudit.instance = new SchoolInfoReuseAudit();
    }
    return <SchoolInfoReuseAudit>SchoolInfoReuseAudit.instance;
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

export { SchoolInfoReuseAudit };
export default SchoolInfoReuseAudit.getInstance;
