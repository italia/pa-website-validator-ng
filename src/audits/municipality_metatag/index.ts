"use strict";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import * as jsonschema from "jsonschema";
import { ValidatorResult } from "jsonschema";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page } from "puppeteer";
import * as ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const auditId = "municipality-metatag";
const code = "R.SI.1.1";
const mainTitle = "METATAG";
const greenResult =
  "In tutte le schede servizio analizzate tutti i metatag richiesti sono presenti e corretti.";
const yellowResult =
  "In almeno una delle schede servizio analizzate non tutti i metatag richiesti sono presenti e corretti.";
const redResult =
  "In almeno una delle schede servizio analizzate meno del 50% dei metatag richiesti sono presenti e corretti.";
const subItem = {
  greenResult:
    "Pagine nelle quali tutti i metatag richiesti sono presenti e corretti:",
  yellowResult:
    "Pagine nelle quali almeno il 50% dei metatag richiesti sono presenti e corretti:",
  redResult:
    "Pagine nelle quali meno del 50% dei metatag richiesti sono presenti e corretti:",
};
const title =
  "R.SI.1.1 - METATAG - Nel sito comunale, le voci della scheda servizio devono presentare i metatag descritti dal modello, in base agli standard internazionali.";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const totalJSONVoices = 10;

class MetatagAudit extends Audit {
  public globalResults: GlobalResultsMulti = {
    score: 1,
    details: {
      items: [],
      type: "table",
      summary: "",
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    wrongPages: {
      message: "",
      headings: [],
      pages: [],
    },
    tolerancePages: {
      message: "",
      headings: [],
      pages: [],
    },
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
    info: true,
  };

  public wrongItems: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  async meta() {
    return {
      id: auditId,
      title: title,
      mainTitle: mainTitle,
      auditId: auditId,
      code: code,
    };
  }

  async auditPage(page: Page | null, url: string, error?: string) {
    this.titleSubHeadings = ["JSON valido", "Metatag non presenti o errati"];

    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        missing_elements: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      let $: CheerioAPI = cheerio.load("<html><body></body></html>");

      const item = {
        link: url,
        valid_json: "No",
        missing_keys: "",
      };

      try {
        const data = await page.content();
        $ = await cheerio.load(data);
      } catch (ex) {
        if (!(ex instanceof Error)) {
          throw ex;
        }

        let errorMessage = ex.message;
        errorMessage = errorMessage.substring(
          errorMessage.indexOf('"') + 1,
          errorMessage.lastIndexOf('"'),
        );

        this.pagesInError.push({
          link: url,
          in_index: errorMessage,
        });
      }
      const metatagElement = $('[data-element="metatag"]');
      const metatagJSON = metatagElement.html() ?? "";

      if (!metatagJSON) {
        this.score = 0;

        return {
          score: 0,
        };
      }

      let parsedMetatagJSON = {};
      try {
        parsedMetatagJSON = JSON.parse(metatagJSON.toString());
      } catch {
        if (this.score > 0) {
          this.score = 0;
        }
        this.wrongItems.push(item);
      }

      item.valid_json = "Sì";

      const result: ValidatorResult = jsonschema.validate(
        parsedMetatagJSON,
        metatadaJSONStructure,
      );
      if (result.errors.length <= 0) {
        this.correctItems.push(item);
      } else {
        const missingJSONVoices = await getMissingVoices(result);

        const missingVoicesAmountPercentage = parseInt(
          ((missingJSONVoices.length / totalJSONVoices) * 100).toFixed(0),
        );
        item.missing_keys = missingJSONVoices.join(", ");

        if (missingVoicesAmountPercentage >= 50) {
          if (this.score > 0) {
            this.score = 0;
          }
          this.wrongItems.push(item);
        } else {
          if (this.score > 0.5) {
            this.score = 0.5;
          }
          this.toleranceItems.push(item);
        }
      }

      return {
        score: this.score,
      };
    }
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if (this.globalResults.tolerancePages) {
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    const results = [];
    if (this.pagesInError.length > 0) {
      this.globalResults.error = true;

      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_valid_json: errorHandling.errorColumnTitles[1],
        title_missing_keys: "",
      });

      this.globalResults.pagesInError.message = errorHandling.errorMessage;
      this.globalResults.pagesInError.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];

      for (const item of this.pagesInError) {
        this.globalResults.pagesInError.pages.push(item);
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }
    } else {
      switch (this.score) {
        case 1:
          results.push({
            result: greenResult,
          });
          break;
        case 0.5:
          results.push({
            result: yellowResult,
          });
          break;
        case 0:
          results.push({
            result: redResult,
          });
          break;
      }
    }
    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: subItem.redResult,
        title_valid_json: this.titleSubHeadings[0],
        title_missing_keys: this.titleSubHeadings[1],
      });

      this.globalResults.wrongPages.headings = [
        subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    if (this.toleranceItems.length > 0) {
      results.push({
        result: subItem.yellowResult,
        title_valid_json: this.titleSubHeadings[0],
        title_missing_keys: this.titleSubHeadings[1],
      });
      if (this.globalResults.tolerancePages) {
        this.globalResults.tolerancePages.headings = [
          subItem.yellowResult,
          this.titleSubHeadings[0],
          this.titleSubHeadings[1],
        ];

        for (const item of this.toleranceItems) {
          this.globalResults.tolerancePages.pages.push(item);
          results.push({
            subItems: {
              type: "subitems",
              items: [item],
            },
          });
        }
      }

      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: subItem.greenResult,
        title_valid_json: this.titleSubHeadings[0],
        title_missing_keys: this.titleSubHeadings[1],
      });

      this.globalResults.correctPages.headings = [
        subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);

        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    this.globalResults.details.items = results;
    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.score = this.score;

    return this.globalResults;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = greenResult;
    } else if (this.score == 0.5) {
      status = "average";
      message = yellowResult;
    } else {
      status = "fail";
      message = redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): MetatagAudit {
    if (!MetatagAudit.instance) {
      MetatagAudit.instance = new MetatagAudit();
    }
    return <MetatagAudit>MetatagAudit.instance;
  }

  async getType() {
    return auditId;
  }
}

const metatadaJSONStructure = {
  type: "object",

  properties: {
    name: { type: "string", minLength: 1 },
    serviceType: { type: "string", minLength: 1 },
    serviceOperator: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
      },

      required: ["name"],
    },
    areaServed: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
      },

      required: ["name"],
    },
    audience: {
      type: "object",
      properties: {
        audienceType: { type: "string", minLength: 1 },
      },

      required: ["audienceType"],
    },
    availableChannel: {
      type: "object",
      properties: {
        serviceUrl: { type: "string", minLength: 1 },
        serviceLocation: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            address: {
              type: "object",
              properties: {
                streetAddress: { type: "string", minLength: 1 },
                postalCode: { type: "string", minLength: 1 },
                addressLocality: { type: "string", minLength: 1 },
              },

              required: ["streetAddress", "postalCode", "addressLocality"],
            },
          },

          required: ["name", "address"],
        },
      },

      required: ["serviceUrl", "serviceLocation"],
    },
  },

  required: [
    "name",
    "serviceType",
    "serviceOperator",
    "areaServed",
    "audience",
    "availableChannel",
  ],
};

const getMissingVoices = async (result: ValidatorResult) => {
  let voices: string[] = [];

  for (const error of result.errors) {
    voices.push(error.property + "." + error.argument);

    if (error.argument === "availableChannel") {
      voices.splice(-1);
      voices = [
        ...voices,
        ...[
          "instance.availableChannel.serviceUrl",
          "instance.availableChannel.serviceLocation.name",
          "instance.availableChannel.serviceLocation.address.streetAddress",
          "instance.availableChannel.serviceLocation.address.postalCode",
          "instance.availableChannel.serviceLocation.address.addressLocality",
        ],
      ];
    } else if (error.argument === "serviceLocation") {
      voices.splice(-1);
      voices = [
        ...voices,
        ...[
          "instance.availableChannel.serviceLocation.name",
          "instance.availableChannel.serviceLocation.address.streetAddress",
          "instance.availableChannel.serviceLocation.address.postalCode",
          "instance.availableChannel.serviceLocation.address.addressLocality",
        ],
      ];
    } else if (error.argument === "address") {
      voices.splice(-1);
      voices = [
        ...voices,
        ...[
          "instance.availableChannel.serviceLocation.address.streetAdress",
          "instance.availableChannel.serviceLocation.address.postalCode",
          "instance.availableChannel.serviceLocation.address.addressLocality",
        ],
      ];
    }
  }

  return voices.map(function (x) {
    return x.replace("instance.", "").replace(/[0-9]/g, "");
  });
};

export { MetatagAudit };
export default MetatagAudit.getInstance;
