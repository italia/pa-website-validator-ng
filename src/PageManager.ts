import { EventEmitter } from "events";
import { PageData } from "./types/crawler-types.js";

interface Results {
  audits: Record<string, unknown>;
}
class PageManager {
  private static instance: PageManager;
  private pagesArray: PageData[] = [];
  private firstAdd = true;
  private globalResult: Results = {
    audits: {},
  };
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(Infinity);
  }

  public static getInstance(): PageManager {
    if (!PageManager.instance) {
      PageManager.instance = new PageManager();
    }
    return PageManager.instance;
  }

  async addPage(page: PageData): Promise<void> {
    const numberOfConcurrentPages = process.env["concurrentPages"]
      ? parseInt(process.env["concurrentPages"])
      : 20;
    if (
      !this.pagesArray.find(
        (pageEl) => pageEl.url == page.url && page.type == pageEl.type,
      )
    ) {
      this.pagesArray.push(page);

      const pages = this.pagesArray.filter((p) => p.scanning);

      if (pages.length <= numberOfConcurrentPages && this.firstAdd) {
        await this.setScanning(page.url, page.type, true);
        this.emitter.emit("pagesAdded", page);

        if (pages.length === numberOfConcurrentPages) {
          this.firstAdd = false;
        }
      }
    }
  }

  async closeScript(results: Record<string, unknown>): Promise<void> {
    this.emitter.emit("scriptClosed", results);
  }

  async closePage(page: PageData): Promise<void> {
    const numberOfConcurrentPages = process.env["concurrentPages"]
      ? parseInt(process.env["concurrentPages"])
      : 20;
    await this.setScanning(page.url, page.type, false);
    const usablePage = this.pagesArray.find(
      (p) =>
        (!p.gathered ||
          !p.audited ||
          (p.gathered &&
            p.audited &&
            (p.temporaryGatherer || p.temporaryAudit))) &&
        !p.scanning,
    );
    const pages = this.pagesArray.filter((p) => p.scanning);
    if (usablePage) {
      if (pages.length <= numberOfConcurrentPages) {
        await this.setScanning(usablePage.url, usablePage.type, true);
        this.emitter.emit("pagesClosed", { ...usablePage, scanning: true });
        this.firstAdd = true;
      }
    }
  }

  async setGlobalResults(result: Record<string, unknown>) {
    const audits = this.globalResult.audits;
    const newKey = Object.keys(result)[0];
    const foundKey = Object.keys(audits).find((el) => el == newKey);
    if (foundKey) {
      audits[foundKey] = Object.values(result)[0];
    } else {
      audits[newKey] = Object.values(result)[0];
    }
    this.globalResult.audits = audits;
  }

  async getGlobalResults() {
    return this.globalResult;
  }

  removePage(id: string) {
    this.pagesArray.filter((el) => el.id != id);
  }

  onPagesAdded(callback: (pageData: PageData) => void): void {
    this.emitter.on("pagesAdded", callback);
  }

  onPagesClosed(callback: (pageData: PageData) => void): void {
    this.emitter.on("pagesClosed", callback);
  }

  async onScriptClosed(callback: (results: Record<string, unknown>) => void) {
    this.emitter.on("scriptClosed", callback);
  }

  getPageById(id: string): PageData | undefined {
    return this.pagesArray.find((page) => page.id === id);
  }

  getPageByUrl(url: string, pageType: string): PageData | undefined {
    return this.pagesArray.find(
      (page: PageData) => page.url === url && page.type === pageType,
    );
  }

  getAllPages(): PageData[] {
    return [...this.pagesArray];
  }

  setAudited(url: string, pageType: string) {
    const page = this.pagesArray.find(
      (page) => page.url === url && page.type === pageType,
    );
    if (page) page.audited = true;
  }

  setGathered(url: string, pageType: string) {
    const page = this.pagesArray.find(
      (page) => page.url === url && page.type === pageType,
    );
    if (page) page.gathered = true;
  }

  setNotTemporaryGatherer(url: string, pageType: string) {
    const page = this.pagesArray.find(
      (page) => page.url === url && page.type === pageType,
    );
    if (page) page.temporaryGatherer = false;
  }

  setNotTemporaryAudit(url: string, pageType: string) {
    const page = this.pagesArray.find(
      (page) => page.url === url && page.type === pageType,
    );
    if (page) page.temporaryAudit = false;
  }

  setScanning(url: string, pageType: string, value: boolean) {
    const page = this.pagesArray.find(
      (page) => page.url === url && page.type === pageType,
    );
    if (page) page.scanning = value;
  }

  setErrors(
    url: string,
    pageType: string,
    errors: string[],
    returnPage?: boolean,
  ): PageData | undefined {
    const page = this.pagesArray.find(
      (page) => page.url === url && page.type === pageType,
    );
    if (page) page.errors = errors;

    if (returnPage) {
      return page;
    }

    return;
  }

  hasRemainingPages() {
    const remainingPages = this.pagesArray.find(
      (el) =>
        !el.audited ||
        !el.gathered ||
        el.temporaryGatherer ||
        el.temporaryAudit,
    );
    return remainingPages != undefined;
  }
}

export default PageManager.getInstance();
