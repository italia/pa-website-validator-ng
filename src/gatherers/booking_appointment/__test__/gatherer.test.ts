import { bookingAppointmentGatherer } from "../index.js";
import { browser, testGatherer } from "../../../../jest.setup.js";
import path from "path";
import { Page } from "puppeteer";
import { Gatherer } from "../../Gatherer.js";

let page: Page | null;
let gatherer: Gatherer | null;

describe("booking_appointment", () => {
  beforeEach(async () => {
    gatherer = new bookingAppointmentGatherer("", 3000);
    page = browser ? await browser.newPage() : null;
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test("fail", async () => {
    await testGatherer(page, gatherer, path.join(__dirname, "fail.html"), 0);
  }, 30000);

  test("pass", async () => {
    await testGatherer(page, gatherer, path.join(__dirname, "pass.html"), 1);
  }, 30000);
});
