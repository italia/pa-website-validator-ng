"use strict";

import { Audit } from "../Audit.js";

class InfoDomainAudit extends Audit {
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
      details: {
        items: [
          {
            key: "result",
            itemType: "text",
            text: "Risultato",
          },
        ],
        headings: [
          {
            result:
              "Questo audit produce un risultato solo quando viene effettuato su un sito pubblicato online.",
          },
        ],
        type: "table",
      },
    };
  }

  static getInstance(): Promise<InfoDomainAudit> {
    if (!InfoDomainAudit.instance) {
      InfoDomainAudit.instance = new InfoDomainAudit("", [], []);
    }
    return InfoDomainAudit.instance;
  }
}

export { InfoDomainAudit };
export default InfoDomainAudit.getInstance;
