"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { loadPageData } from "../../utils/utils.js";
import { CheerioAPI } from "cheerio";
import { ValidatorResult } from "jsonschema";
import * as jsonschema from "jsonschema";
import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  errorHandling,
  notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import { DataElementError } from "../../utils/DataElementError.js";
import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import * as cheerio from "cheerio";
import {MenuAudit} from "../municipality_menu";

const auditId = "municipality-metatag";
const auditData = auditDictionary[auditId];

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const totalJSONVoices = 10;

class MetatagAudit extends Audit {

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    errorMessage: ''
  };
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError : any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings : any = [];

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null,
    error?: string
  ) {
    if (error && !page) {

      this.score = 0;

      this.pagesInError.push({
        inspected_page: '',
        wrong_order_elements: "",
        missing_elements: error,
      });

      return {
        score: 0,
      }
    }

    if (page) {
      let url = page.url();

      this.titleSubHeadings = ["JSON valido", "Metatag non presenti o errati"];
      this.headings = [
        {
          key: "result",
          itemType: "text",
          text: "Risultato",
          subItemsHeading: {key: "inspected_page", itemType: "url"},
        },
        {
          key: "title_valid_json",
          itemType: "text",
          text: "",
          subItemsHeading: {
            key: "valid_json",
            itemType: "text",
          },
        },
        {
          key: "title_missing_keys",
          itemType: "text",
          text: "",
          subItemsHeading: {
            key: "missing_keys",
            itemType: "text",
          },
        },
      ];

      let $: CheerioAPI | any = null;

      const item = {
        inspected_page: url,
        valid_json: "No",
        missing_keys: "",
      };

      try {
        let data = await page.content();
        $ = await cheerio.load(data);

      } catch (ex) {
        if (!(ex instanceof Error)) {
          throw ex;
        }

        let errorMessage = ex.message;
        errorMessage = errorMessage.substring(
            errorMessage.indexOf('"') + 1,
            errorMessage.lastIndexOf('"')
        );

        this.pagesInError.push({
          inspected_page: url,
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
      } catch (e) {
        if (this.score > 0) {
          this.score = 0;
        }
        this.wrongItems.push(item);
      }

      item.valid_json = "Sì";

      const result: ValidatorResult = jsonschema.validate(
          parsedMetatagJSON,
          metatadaJSONStructure
      );
      if (result.errors.length <= 0) {
        this.correctItems.push(item);
      } else {
        const missingJSONVoices = await getMissingVoices(result);

        const missingVoicesAmountPercentage = parseInt(
            ((missingJSONVoices.length / totalJSONVoices) * 100).toFixed(0)
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
    const results = [];
    if (this.pagesInError.length > 0) {
      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_valid_json: errorHandling.errorColumnTitles[1],
        title_missing_keys: "",
      });

      for (const item of this.pagesInError) {
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
            result: auditData.greenResult,
          });
          break;
        case 0.5:
          results.push({
            result: auditData.yellowResult,
          });
          break;
        case 0:
          results.push({
            result: auditData.redResult,
          });
          break;
      }
    }
    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: auditData.subItem.redResult,
        title_valid_json: this.titleSubHeadings[0],
        title_missing_keys: this.titleSubHeadings[1],
      });

      for (const item of this.wrongItems) {
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
        result: auditData.subItem.yellowResult,
        title_valid_json: this.titleSubHeadings[0],
        title_missing_keys: this.titleSubHeadings[1],
      });

      for (const item of this.toleranceItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: auditData.subItem.greenResult,
        title_valid_json: this.titleSubHeadings[0],
        title_missing_keys: this.titleSubHeadings[1],
      });

      for (const item of this.correctItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    this.globalResults.details.headings = this.headings;
    this.globalResults.details.items = results;
    this.globalResults.errorMessage = this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.score = this.score;

    return this.globalResults
  }

  static getInstance(): Promise<MetatagAudit> {
    if (!MetatagAudit.instance) {
      MetatagAudit.instance = new MetatagAudit('',[],[]);
    }
    return MetatagAudit.instance;
  }

  async getType(){
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
