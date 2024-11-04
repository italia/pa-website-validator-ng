"use strict";

import { Audit } from "../Audit.js";

class InfoReuseAudit extends Audit {
  code = "";
  mainTitle = "";
  title = "";
  info = true;
  infoScore = true;

  async meta() {
    return {
      id: this.auditId,
      title: this.title,
      code: this.code,
      mainTitle: this.mainTitle,
    };
  }

  async auditPage() {
    return {};
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return {
      score: null,
    };
  }

  static getInstance(): InfoReuseAudit {
    if (!InfoReuseAudit.instance) {
      InfoReuseAudit.instance = new InfoReuseAudit();
    }
    return <InfoReuseAudit>InfoReuseAudit.instance;
  }
}

export { InfoReuseAudit };
export default InfoReuseAudit.getInstance;
