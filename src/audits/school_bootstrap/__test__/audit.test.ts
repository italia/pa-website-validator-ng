import { SchoolBootstrap } from "../index.js";
import path from "path";
import { browser, testAudit } from "../../../../jest.setup.js";
import { Page } from "puppeteer";
import { Audit } from "../../Audit.js";

let page: Page | null;
let audit: Audit | null;

describe("school_bootstrap", () => {
  beforeEach(async () => {
    audit = new SchoolBootstrap();
    page = browser ? await browser.newPage() : null;
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test("pass", async () => {
    await testAudit(page, audit, path.join(__dirname, "pass.html"), 1);
  }, 30000);

  test("fail", async () => {
    await testAudit(page, audit, path.join(__dirname, "fail.html"), 0);
  }, 30000);
});
