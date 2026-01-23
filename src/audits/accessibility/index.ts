"use strict";

import { CheerioAPI } from "cheerio";

import {
  getAllPageHTML,
  safePageContent,
  urlExists,
} from "../../utils/utils.js";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import * as cheerio from "cheerio";
import axios from "axios";

class A11yAudit extends Audit {
  mainTitle = "";
  code = "";
  title = "";

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
  };

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page, url: string) {
    this.globalResults.pagesItems.headings = [
      "Testo del link",
      "Pagina di destinazione del link",
      "Pagina esistente",
      "La pagina contiene l'url del sito di origine",
      "È dichiarata la conformità alle specifiche WCAG 2.1 o superiori",
    ];

    const items = [
      {
        link_name: "",
        link: "",
        existing_page: "No",
        page_contains_correct_url: "",
        wcag: "",
      },
    ];

    const data = await safePageContent(page);
    const $: CheerioAPI = await cheerio.load(data);

    const accessibilityDeclarationElement = $("footer").find(
      '[data-element="accessibility-link"]',
    );
    const elementObj = $(accessibilityDeclarationElement).attr();
    items[0].link_name = accessibilityDeclarationElement.text().trim() ?? "";
    items[0].link = elementObj?.href ?? url;

    if (!elementObj) {
      this.globalResults.intermediateMessage = true;
    }

    if (
      elementObj &&
      "href" in elementObj &&
      elementObj.href !== "#" &&
      elementObj.href !== ""
    ) {
      const href = elementObj.href;
      const checkUrl = await urlExists(url, href);

      if (checkUrl.exception)
        throw new Error("Possibile errore del server AGID, verificare.");

      if (!checkUrl.result) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      items[0].link = checkUrl.inspectedUrl;

      items[0].existing_page = "Sì";
      items[0].page_contains_correct_url = "No";
      items[0].wcag = "No";

      if (!href.includes("https://form.agid.gov.it/")) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      const domain = new URL(url).host.replace(/^www./, "");

      const uuidMatch = href.match(
        /form\.agid\.gov\.it\/view\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
      );

      const rx = /^([^/]*\/)(.*)(\/dichiarazione)$/;

      let a11Url = href;

      if (uuidMatch) {
        const uuid = uuidMatch[1];
        const res = await axios.get(
          `https://form.agid.gov.it/api/v1/agid-form/dichiarazione-accessibilita/dichiarazione-by-old-id/${uuid}`,
        );

        if (res.status !== 200) {
          throw new Error(
            "Possibile nella risoluzione dell’URL da parte di AgID, verificare.",
          );
        }

        const idPubblicazione: string = res.data.idPubblicazione;
        const path = idPubblicazione.replace(
          rx,
          (_, g1, g2, g3) => `${g1}${g2.replace(/\//g, "%2f")}${g3}`,
        );
        a11Url = `https://form.agid.gov.it/${path}`;
      }

      const a11PageHTML: string = await getAllPageHTML(a11Url);
      if (!a11PageHTML.match(new RegExp(domain, "i"))) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      }

      items[0].page_contains_correct_url = "Sì";

      if (!a11PageHTML.match(/wcag 2.1|wcag-21|wcag 2.2/i)) {
        this.globalResults.score = 0;
        this.globalResults.pagesItems.pages = items;

        return {
          score: 0,
        };
      } else {
        items[0].wcag = "Sì";
      }

      this.globalResults.score = 1;
    }

    this.globalResults.id = this.auditId;
    this.globalResults.pagesItems.pages = items;

    return {
      score: this.globalResults.score,
    };
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  static getInstance(): A11yAudit {
    if (!A11yAudit.instance) {
      A11yAudit.instance = new A11yAudit();
    }
    return <A11yAudit>A11yAudit.instance;
  }
}

export { A11yAudit };
export default A11yAudit.getInstance;
