import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page, Cookie as CookieProtocol } from "puppeteer";
import { Cookie } from "../../types/crawler-types";
import { DataElementError } from "../../utils/DataElementError.js";
import { redirectUrlIsInternal } from "../../utils/utils.js";

class CookieAudit extends Audit {
  public globalResults: GlobalResultsMulti = {
    score: 1,
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

  async returnErrors(
    error: DataElementError | Error | string,
    url: string,
    pageType: string,
    inError = true,
  ) {
    if (pageType !== "event") {
      if (inError) {
        this.showError = true;
      }

      this.globalResults.score = 0;

      this.globalResults.pagesInError.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];
      this.globalResults.pagesInError.message = errorHandling.errorMessage;

      this.globalResults.pagesInError.pages.push({
        link: url,
        result:
          error instanceof DataElementError || error instanceof Error
            ? error.message
            : String(error),
        show: inError,
      });

      this.globalResults.error = this.showError;
      this.score = 0;
      this.globalResults.score = 0;

      return {
        score: 0,
      };
    }
  }

  async auditPage(page: Page, url: string) {
    if (!(await redirectUrlIsInternal(page))) {
      return;
    }

    this.titleSubHeadings = [
      "Dominio del cookie",
      "Nome del cookie",
      "Valore del cookie",
    ];

    try {
      const items = [];
      let score = 1;

      const cookies: CookieProtocol[] = await page.cookies();

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
    } catch (ex) {
      this.score = 0;

      let errorMessage = "";
      if (!(ex instanceof Error)) {
        errorMessage = String(ex);
      } else {
        errorMessage = ex.message;
      }

      this.globalResults.wrongPages.pages.push({
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

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.wrongPages.pages = [];

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        this.subItem?.redResult ?? "",
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
      }
    }

    if (this.correctItems.length > 0) {
      this.globalResults.correctPages.headings = [
        this.subItem?.greenResult ?? "",
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
        this.titleSubHeadings[2],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";
    this.score =
      this.globalResults.pagesInError.pages.length > 0 ? 0 : this.score;
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
    const siteDomain = new URL(
      process.env.website as string,
    ).hostname.replaceAll("www.", "");

    if (
      pageUrl === cookie.domain.replaceAll("www.", "") ||
      cookie.domain.endsWith("." + pageUrl) ||
      cookie.domain.endsWith("." + siteDomain)
    ) {
      cookieValues.is_correct = true;
    }

    returnValue.push(cookieValues);
  }

  return returnValue;
}
