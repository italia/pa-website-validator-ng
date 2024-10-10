"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {Audit} from "../Audit.js";

const auditId = "common-informative-ip-location";
const auditData = auditDictionary[auditId];

class InformativeIpAudit extends Audit {
  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: [],
    };
  }

  async auditPage(){
    return {}
  }

  async getType(){
    return auditId;
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

  static getInstance(): Promise<InformativeIpAudit> {
    if (!InformativeIpAudit.instance) {
      InformativeIpAudit.instance = new InformativeIpAudit('',[],[]);
    }
    return InformativeIpAudit.instance;
  }

}

export {InformativeIpAudit};
export default InformativeIpAudit.getInstance;
