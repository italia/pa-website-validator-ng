"use strict";

import {Audit} from "../Audit.js";

class InfoCookieDomain extends Audit {
  code = ''
  mainTitle = '';
  info= true

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
