"use strict";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as dns from "dns";
import * as util from "util";
import geoip from "geoip-lite";
import { allowedCountries } from "../../storage/common/allowedCountries.js";
import { Page } from "puppeteer";
import {Audit, GlobalResults} from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

const auditId = "common-security-ip-location";

const greenResult ="L'hosting è su territorio europeo.";
const redResult = "L'hosting non è su territorio europeo.";

class IpLocationAudit extends Audit {
  public globalResults: GlobalResults = {
    score: 0,
    details: {
      items: [],
      type: "table",
      summary: "",
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  code = "LOCALIZZAZIONE IP";
  mainTitle = "LOCALIZZAZIONE IP";

  score = 0;

  async meta() {
    return {
      id: auditId,
      title: "LOCALIZZAZIONE IP - Il sito deve essere ospitato su datacenter localizzati su territorio europeo.",
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: auditId,
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    if (error && !page) {
      this.globalResults.score = 0;
      this.globalResults.details.items.push(
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      );

      this.globalResults.pagesItems.headings = ["Risultato"];
      this.globalResults.pagesItems.message = notExecutedErrorMessage.replace(
        "<LIST>",
        error,
      );
      this.globalResults.pagesItems.pages = [
        {
          result: redResult,
        },
      ];

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();
      const hostname = new URL(url).hostname.replace("www.", "");
      this.score = 0;

      this.globalResults.pagesItems.headings = [
        "Risultato",
        "Città indirizzo IP",
        "Paese indirizzo IP",
      ];
      const items = [{ result: redResult, ip_city: "", ip_country: "" }];

      if (hostname) {
        const lookup = util.promisify(dns.lookup);
        const ip = await lookup(hostname);

        if (Boolean(ip) && Boolean(ip.address)) {
          const ipInformation = geoip.lookup(ip.address);

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
      this.globalResults.pagesItems.pages = items;

      return {
        score: this.score,
      };
    }
  }

  async getType() {
    return auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = greenResult;
    } else {
      status = "fail";
      message = redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): IpLocationAudit {
    if (!IpLocationAudit.instance) {
      IpLocationAudit.instance = new IpLocationAudit();
    }
    return <IpLocationAudit>IpLocationAudit.instance;
  }
}

export { IpLocationAudit };
export default IpLocationAudit.getInstance;
