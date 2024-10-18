import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Browser, Page, Cookie as CookieProtocol } from "puppeteer";
import { Cookie } from "../../types/crawler-types";
import { gotoRetry } from "../../utils/utils.js";
import { initializePuppeteerOld } from "../../PuppeteerInstanceOld.js";

class CookieAudit extends Audit {
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
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };
  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public pagesInError: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  code = "";
  mainTitle = "";
  title = "";

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(
    page: Page | null,
    url: string,
    error?: string,
    pageType?: string | null,
  ) {
    this.titleSubHeadings = [
      "Dominio del cookie",
      "Nome del cookie",
      "Valore del cookie",
    ];

    if (error && !page && pageType !== "event") {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        cookie_domain: error,
      });

      this.globalResults.error = true;

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

      try {
        const items = [];
        let score = 1;

        const oldBrowser: Browser | null = await initializePuppeteerOld();

        if (oldBrowser) {
          const oldPage = await oldBrowser.newPage();

          await gotoRetry(oldPage, url, errorHandling.gotoRetryTentative);

          const cookies: CookieProtocol[] = await oldPage.cookies();

          await oldPage.close();

          const resultCookies = await checkCookieDomain(url, cookies);

          for (const resultCookie of resultCookies) {
            if (!resultCookie.is_correct) {
              score = 0;
            }

            items.push(resultCookie);
          }

          if (score < this.score) {
            this.score = score;
          }

          for (const item of items) {
            if (item.is_correct) {
              this.correctItems.push({
                link: item.link,
                cookie_domain: item.cookie_domain,
                cookie_name: item.cookie_name,
                cookie_value: item.cookie_value,
              });
            } else {
              this.wrongItems.push({
                link: item.link,
                cookie_domain: item.cookie_domain,
                cookie_name: item.cookie_name,
                cookie_value: item.cookie_value,
              });
            }
          }
        } else {
          throw new Error("Non è stato possibile aprire Puppeteer");
        }
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
          cookie_domain: errorMessage,
          cookie_name: "",
          cookie_value: "",
        });
      }

      return {
        score: this.score,
      };
    }
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

    const results = [];

    switch (this.score) {
      case 1:
        results.push({
          result: this.greenResult,
        });
        break;
      case 0:
        results.push({
          result: this.redResult,
        });
        break;
    }

    if (this.pagesInError.length) {
      this.globalResults.error = true;

      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_cookie_domain: errorHandling.errorColumnTitles[1],
        title_cookie_name: "",
        title_cookie_value: "",
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
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: this.subItem?.redResult ?? "",
        title_cookie_domain: this.titleSubHeadings[0],
        title_cookie_name: this.titleSubHeadings[1],
        title_cookie_value: this.titleSubHeadings[2],
      });

      this.globalResults.wrongPages.headings = [
        this.subItem?.redResult ?? "",
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
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

    if (this.correctItems.length > 0) {
      results.push({
        result: this.subItem?.greenResult ?? "",
        title_cookie_domain: this.titleSubHeadings[0],
        title_cookie_name: this.titleSubHeadings[1],
        title_cookie_value: this.titleSubHeadings[2],
      });

      this.globalResults.correctPages.headings = [
        this.subItem?.greenResult ?? "",
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
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

    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";
    this.globalResults.details.items = results;
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

    return this.globalResults;
  }

  static getInstance(): CookieAudit {
    if (!CookieAudit.instance) {
      CookieAudit.instance = new CookieAudit();
    }
    return <CookieAudit>CookieAudit.instance;
  }
}

export { CookieAudit };
export default CookieAudit.getInstance;

async function checkCookieDomain(
  url: string,
  cookies: CookieProtocol[],
): Promise<Cookie[]> {
  const returnValue = [];

  for (const cookie of cookies) {
    const cookieValues = {
      link: url,
      cookie_domain: cookie.domain,
      cookie_name: cookie.name,
      cookie_value: cookie.value,
      is_correct: false,
    };

    const pageUrl = new URL(url).hostname.replaceAll("www.", "");

    if (
      pageUrl === cookie.domain.replaceAll("www.", "") ||
      cookie.domain.endsWith("." + pageUrl)
    ) {
      cookieValues.is_correct = true;
    }

    returnValue.push(cookieValues);
  }

  return returnValue;
}
