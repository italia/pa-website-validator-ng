"use strict";

import { CheerioAPI } from "cheerio";

import { buildUrl, isInternalUrl } from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import * as cheerio from "cheerio";
import { compareVersions } from "compare-versions";
import axios from "axios";
import { cmsThemeRx } from "./cmsThemeRx.js";

class ThemeAudit extends Audit {
  public globalResults: GlobalResults = {
    score: 0,
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
    id: "",
  };

  protected minVersion = "1.0.0";
  code = "";
  mainTitle = "";
  title = "";

  async meta() {
    return {
      id: this.auditId,
      title: this.title,
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page, url: string) {
    let score = 0.5;
    const items = [
      {
        result: this.yellowResult,
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
        if ((await isInternalUrl(styleCSSUrl)) && !styleCSSUrl.includes(url)) {
          styleCSSUrl = await buildUrl(url, styleCSSUrl);
        }

        let CSSContent = "";
        try {
          const response = await axios.get(styleCSSUrl);
          CSSContent = typeof response.data === "string" ? response.data : "";
        } catch {
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
        items[0].result = this.redResult;

        if (compareVersions(version, this.minVersion) >= 0) {
          score = 1;
          items[0].result = this.greenResult;
        }
        break;
      }
    }

    this.globalResults.score = score;
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

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  static getInstance(): ThemeAudit {
    if (!ThemeAudit.instance) {
      ThemeAudit.instance = new ThemeAudit();
    }
    return <ThemeAudit>ThemeAudit.instance;
  }
}

export { ThemeAudit };
export default ThemeAudit.getInstance;
