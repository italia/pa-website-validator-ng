"use strict";

import { Audit } from "../Audit.js";

class InfoReuseAudit extends Audit {
  code = "";
  mainTitle = "";
  info = true;

  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      code: this.code,
      mainTitle: this.mainTitle,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
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
