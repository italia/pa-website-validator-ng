"use strict";
import {Audit} from '../Audit.js'

class ipLocationAudit extends Audit {
  static get meta() {
    return {
      id: "auditId",
      title: "title",
      failureTitle: "failureTitle",
      description: "description",
      scoreDisplayMode: "INFORMATIVE",
      requiredArtifacts: [],
    };
  }

  static async audit(): Promise<{
    score: number;
    details: any
  }> {
    

    return {
      score: 100,
      details: ""
    }
  }
}

module.exports = ipLocationAudit;
