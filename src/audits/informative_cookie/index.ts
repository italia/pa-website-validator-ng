"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { auditDictionary } from "../../storage/auditDictionary.js";
import {Audit} from "../Audit.js";


const auditId = "municipality-informative-cookie-domain-check";
const auditData = auditDictionary[auditId];

class InfoCookieDomain extends Audit {
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

  static getInstance(): Promise<InfoCookieDomain> {
    if (!InfoCookieDomain.instance) {
      InfoCookieDomain.instance = new InfoCookieDomain('',[],[]);
    }
    return InfoCookieDomain.instance;
  }

}

export {InfoCookieDomain};
export default InfoCookieDomain.getInstance;
