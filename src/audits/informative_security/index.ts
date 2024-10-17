"use strict";

import { Audit } from "../Audit.js";

class InfoSecurityAudit extends Audit {
  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.INFORMATIVE,
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

  static getInstance(): Promise<InfoSecurityAudit> {
    if (!InfoSecurityAudit.instance) {
      InfoSecurityAudit.instance = new InfoSecurityAudit("", [], []);
    }
    return InfoSecurityAudit.instance;
  }
}

export { InfoSecurityAudit };
export default InfoSecurityAudit.getInstance;
