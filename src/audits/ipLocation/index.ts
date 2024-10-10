"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as dns from "dns";
import * as util from "util";
import geoip from "geoip-lite";
import { allowedCountries } from "../../storage/common/allowedCountries.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import {Page} from "puppeteer";
import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
const auditId = "common-security-ip-location";
const auditData = auditDictionary[auditId];

const greenResult = auditData.greenResult;
const redResult = auditData.redResult;

class IpLocationAudit extends Audit {
  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    errorMessage: ''
  };

  score = 0;

  async meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["hostname"],
    };
  }

  async auditPage(
      page: Page | null,
      error?:string
  ) {
    if(error && !page){

      this.globalResults.score = 0;
      this.globalResults.details.items.push([
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ]);
      this.globalResults.details.headings= [{ key: "result", itemType: "text", text: "Risultato" }];

      return {
        score: 0,
      }
    }

    if(page){
      const url = page.url()
      const hostname = new URL(url).hostname.replace("www.", "");
      this.score = 0;

      this.globalResults.details.headings = [
        { key: "result", itemType: "text", text: "Risultato" },
        { key: "ip_city", itemType: "text", text: "Città indirizzo IP" },
        { key: "ip_country", itemType: "text", text: "Paese indirizzo IP" },
      ];
      const items = [{ result: redResult, ip_city: "", ip_country: "" }];

      if (hostname) {
        const lookup = util.promisify(dns.lookup);
        const ip = await lookup(hostname);

        if (Boolean(ip) && Boolean(ip.address)) {
          const ipInformation = geoip.lookup(ip.address);
          console.log(ip);

          if (ipInformation !== null) {
            if (allowedCountries.includes(ipInformation.country)) {
              this.score = 1;
              items[0].result = greenResult;
            }

            items[0].ip_city = ipInformation.city ?? "";
            items[0].ip_country = ipInformation.country ?? "";
          }
        }
      }

      this.globalResults.score = this.score;
      this.globalResults.details.items = items;

      return {
        score: this.score,
      };
    }
  }

  async getType(){
    return auditId;
  }

  async returnGlobal(){
    return this.globalResults;
  }

  static getInstance(): Promise<IpLocationAudit> {
    if (!IpLocationAudit.instance) {
      IpLocationAudit.instance = new IpLocationAudit('',[],[]);
    }
    return IpLocationAudit.instance;
  }

}

export {IpLocationAudit};
export default IpLocationAudit.getInstance;

