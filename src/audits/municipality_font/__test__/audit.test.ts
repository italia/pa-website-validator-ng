import { MunicipalityFontAudit } from "../index.js";
import path from "path";
import { browser, testAudit } from "../../../../jest.setup.js";
import { Page } from "puppeteer";
import { Audit } from "../../Audit.js";

let page: Page | null;
let audit: Audit | null;

describe("municipality_font", () => {
  beforeEach(async () => {
    audit = new MunicipalityFontAudit();
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

  test("fail:0.5", async () => {
    await testAudit(page, audit, path.join(__dirname, "fail_05.html"), 0.5);
  }, 30000);
});