"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {Audit} from "../Audit.js";

class InfoCloudAudit extends Audit {
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
      score: null,
    }
  }

  static getInstance(): Promise<InfoCloudAudit> {
    if (!InfoCloudAudit.instance) {
      InfoCloudAudit.instance = new InfoCloudAudit('',[],[]);
    }
    return InfoCloudAudit.instance;
  }

}

export {InfoCloudAudit};
export default InfoCloudAudit.getInstance;
