"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {Audit} from "../Audit.js";

const auditId = "municipality-informative-security";
const auditData = auditDictionary[auditId];

class InfoSecurityAudit extends Audit {
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

  static getInstance(): Promise<InfoSecurityAudit> {
    if (!InfoSecurityAudit.instance) {
      InfoSecurityAudit.instance = new InfoSecurityAudit('',[],[]);
    }
    return InfoSecurityAudit.instance;
  }

}

export {InfoSecurityAudit};
export default InfoSecurityAudit.getInstance;