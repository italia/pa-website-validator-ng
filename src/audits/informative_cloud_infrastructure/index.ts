"use strict";
import { Audit } from "../Audit.js";

class InfoCloudAudit extends Audit {
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

  static getInstance(): InfoCloudAudit {
    if (!InfoCloudAudit.instance) {
      InfoCloudAudit.instance = new InfoCloudAudit();
    }
    return <InfoCloudAudit>InfoCloudAudit.instance;
  }
}

export { InfoCloudAudit };
export default InfoCloudAudit.getInstance;
