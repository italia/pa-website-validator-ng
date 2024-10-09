"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {Audit} from "../Audit.js";

const auditId = "municipality-informative-reuse";
const auditData = auditDictionary[auditId];

class InfoReuseAudit extends Audit {
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

  async auditPage(){
    return {}
  }

  async getType(){
    return this.auditId;
  }

  async returnGlobal(){
    return {
      score: null,
    }
  }

  static getInstance(): Promise<InfoReuseAudit> {
    if (!InfoReuseAudit.instance) {
      InfoReuseAudit.instance = new InfoReuseAudit('',[],[]);
    }
    return InfoReuseAudit.instance;
  }

}

export {InfoReuseAudit};
export default InfoReuseAudit.getInstance;
