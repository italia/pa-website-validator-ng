import { errorHandling } from "../../config/commonAuditsParts.js";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import { Page } from "puppeteer";
import { allowedFonts } from "./allowedFonts.js";

type BadElement = [string[], boolean]; // First value is element snippet, second is whether it is tolerable

class FontAudit extends Audit {
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
  };
  public wrongItems: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  static allowedFonts = allowedFonts;
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

  async auditPage(page: Page, url: string) {
    this.titleSubHeadings = [
      "Numero di <h> o <p> con font errati",
      "Font errati individuati",
    ];

    const item = {
      link: url,
      wrong_number_elements: 0,
      wrong_fonts: "",
    };

    const badElements: Array<BadElement> = await page.evaluate(
      (requiredFonts) => {
        const badElements: Array<BadElement> = [];
        const outerElems = window.document.body.querySelectorAll(
          "h1, h2, h3, h4, h5, h6, p",
        );

        const wrongFonts = (e: Element) => {
          const elementFonts = window
            .getComputedStyle(e)
            .fontFamily.split(",", 1)
            .map((s) => s.replace(/^"|"$/g, ""));
          return elementFonts.filter((x) => !requiredFonts.includes(x));
        };

        for (const e of outerElems) {
          const elementWrongFonts = wrongFonts(e);
          if (elementWrongFonts.length > 0) {
            badElements.push([elementWrongFonts, false]);
            continue;
          }

          const children = [...e.querySelectorAll("*")];
          for (const child of children) {
            const wrongFontChild = wrongFonts(child);
            if (wrongFontChild.length > 0) {
              badElements.push([wrongFontChild, true]);
              break;
            }
          }
        }
        return badElements;
      },
      (this.constructor as typeof FontAudit).allowedFonts,
    );

    if (badElements.length === 0) {
      this.correctItems.push(item);
      return {
        score: this.score,
      };
    }

    const reallyBadElements = badElements.filter((e) => !e[1]);

    const wrongFontsUnique = (arrays: Array<BadElement>) => {
      const arrayUnique = (array: string[]) => {
        const a = array.concat();
        for (let i = 0; i < a.length; ++i) {
          for (let j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j]) a.splice(j--, 1);
          }
        }
        return a;
      };

      let arrayMerged: string[] = [];
      for (const array of arrays) {
        arrayMerged = arrayMerged.concat(array[0]);
      }
      return arrayUnique(arrayMerged);
    };

    if (reallyBadElements.length > 0) {
      if (this.score > 0) {
        this.score = 0;
      }
      item.wrong_fonts = wrongFontsUnique(reallyBadElements).join(", ");
      item.wrong_number_elements = reallyBadElements.length;
      this.wrongItems.push(item);
      return {
        score: this.score,
      };
    }

    if (this.score > 0.5) {
      this.score = 0.5;
    }
    item.wrong_fonts = wrongFontsUnique(badElements).join(", ");
    item.wrong_number_elements = badElements.length;
    this.toleranceItems.push(item);

    return {
      score: this.score,
    };
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if (this.globalResults.tolerancePages) {
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        this.subItem?.redResult ?? "",
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
      }
    }

    if (this.toleranceItems.length > 0) {
      if (this.globalResults.tolerancePages) {
        this.globalResults.tolerancePages.headings = [
          this.subItem?.yellowResult ?? "",
          this.titleSubHeadings[0],
          this.titleSubHeadings[1],
        ];

        for (const item of this.toleranceItems) {
          this.globalResults.tolerancePages.pages.push(item);
        }
      }
    }

    if (this.correctItems.length > 0) {
      this.globalResults.correctPages.headings = [
        this.subItem?.greenResult ?? "",
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";
    this.globalResults.score = this.score;
    this.globalResults.id = this.auditId;

    return this.globalResults;
  }

  static getInstance(): FontAudit {
    if (!FontAudit.instance) {
      FontAudit.instance = new FontAudit();
    }
    return <FontAudit>FontAudit.instance;
  }
}

export { FontAudit };
export default FontAudit.getInstance;
