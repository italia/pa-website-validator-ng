"use strict";

import { CheerioAPI } from "cheerio";

import { buildUrl, isInternalUrl } from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit } from "../Audit.js";
import { notExecutedErrorMessage } from "../../config/commonAuditsParts.js";
import * as cheerio from "cheerio";
import { compareVersions } from "compare-versions";
import axios from "axios";
import { cmsThemeRx } from "./cmsThemeRx.js";

class ThemeAudit extends Audit {
  public globalResults: any = {
    score: 0,
    details: {
      items: [],
      type: "table",
      headings: [],
      summary: "",
    },
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  private headings: any = [];
  protected minVersion = "1.0.0";
  code = "";
  mainTitle = "";

  async meta() {
    return {
      id: this.auditId,
      title: this.auditData.title,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page | null, error?: string) {
    if (error && !page) {
      this.globalResults.score = 0;
      this.globalResults.details.items.push([
        {
          result: notExecutedErrorMessage.replace("<LIST>", error),
        },
      ]);
      this.globalResults.details.headings = [
        { key: "result", itemType: "text", text: "Risultato" },
      ];
      this.globalResults.pagesItems.headings = ["Risultato"];
      this.globalResults.pagesItems.message = notExecutedErrorMessage.replace(
        "<LIST>",
        error,
      );
      this.globalResults.pagesItems.items = [
        {
          result: this.auditData.redResult,
        },
      ];

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      this.headings = [
        {
          key: "result",
          itemType: "text",
          text: "Risultato",
        },
        {
          key: "cms_name",
          itemType: "text",
          text: "Tema CMS del modello in uso",
        },
        {
          key: "theme_version",
          itemType: "text",
          text: "Versione del tema CMS in uso",
        },
      ];

      let score = 0.5;
      const items = [
        {
          result: this.auditData.yellowResult,
          cms_name: "Nessuno",
          theme_version: "N/A",
        },
      ];

      const data = await page.content();
      const $: CheerioAPI = await cheerio.load(data);

      const linkTags = $("link");
      let styleCSSUrl = "";
      for (const linkTag of linkTags) {
        if (!linkTag.attribs || !("href" in linkTag.attribs)) {
          continue;
        }

        if (linkTag.attribs.href.includes(".css")) {
          styleCSSUrl = linkTag.attribs.href;
          if (
            (await isInternalUrl(styleCSSUrl)) &&
            !styleCSSUrl.includes(url)
          ) {
            styleCSSUrl = await buildUrl(url, styleCSSUrl);
          }

          let CSSContent = "";
          try {
            const response = await axios.get(styleCSSUrl);
            CSSContent = typeof response.data === "string" ? response.data : "";
          } catch (e) {
            CSSContent = "";
          }

          const match = CSSContent.match(cmsThemeRx);

          if (match === null || !match.groups) {
            continue;
          }

          items[0].cms_name = match.groups.name;
          const version = match.groups.version;
          items[0].theme_version = version;

          score = 0;
          items[0].result = this.auditData.redResult;

          if (compareVersions(version, this.minVersion) >= 0) {
            score = 1;
            items[0].result = this.auditData.greenResult;
          }
          break;
        }
      }

      this.globalResults.score = score;
      this.globalResults.details.items = items;
      this.globalResults.details.headings = this.headings;
      this.globalResults.id = this.auditId;

      this.globalResults.pagesItems.pages = items;
      this.globalResults.pagesItems.headings = [
        "Risultato",
        "Tema CMS del modello in uso",
        "Versione del tema CMS in uso",
      ];

      return {
        score: score,
      };
    }
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  static getInstance(): Promise<ThemeAudit> {
    if (!ThemeAudit.instance) {
      ThemeAudit.instance = new ThemeAudit("", [], []);
    }
    return ThemeAudit.instance;
  }
}

export { ThemeAudit };
export default ThemeAudit.getInstance;
