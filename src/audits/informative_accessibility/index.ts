"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {Audit} from "../Audit.js";

class InformativeAccAudit extends Audit {
  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(){
    return {}
  }

  async getType(){
    return this.auditId;
  }

  async returnGlobal(){
    return {
      score: 1,
      details: {
        items: [
          {
            key: "result",
            itemType: "text",
            text: "Risultato",
          },
        ],
        headings:[
          {
            result:
                "Questo audit produce un risultato solo quando viene effettuato su un sito pubblicato online.",
          },
        ],
        type: 'table',
      },
    }
  }

  static getInstance(): Promise<InformativeAccAudit> {
    if (!InformativeAccAudit.instance) {
      InformativeAccAudit.instance = new InformativeAccAudit('',[],[]);
    }
    return InformativeAccAudit.instance;
  }

}

export {InformativeAccAudit};
export default InformativeAccAudit.getInstance;
