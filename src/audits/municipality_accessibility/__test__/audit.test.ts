import { MunicipalityA11yAudit } from "../index.js";
import path from "path";
import { browser, testAudit } from "../../../../jest.setup.js";
import { Page } from "puppeteer";
import { Audit } from "../../Audit.js";

let page: Page | null;
let audit: Audit | null;

describe("municipality_accessibility", () => {
  beforeEach(async () => {
    audit = new MunicipalityA11yAudit();
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

  test("fail:data_element", async () => {
    await testAudit(
      page,
      audit,
      path.join(__dirname, "fail_data_element.html"),
      0,
    );
  }, 30000);

  test("fail:button", async () => {
    await testAudit(page, audit, path.join(__dirname, "fail_link.html"), 0);
  }, 30000);
});
