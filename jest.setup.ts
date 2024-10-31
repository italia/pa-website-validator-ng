import { Browser, Page } from 'puppeteer';
import { getBrowser, closeBrowsers } from "./src/PuppeteerInstance.js";
import { Audit } from "./src/audits/Audit.js";

let browser: Browser | void | null;

jest.mock('./src/audits/esmHelpers');
beforeAll(async () => {
  browser = await getBrowser();
});

afterAll(async () => {
  await closeBrowsers();
});

export { browser };

export const testAudit = async (
  page: Page | null,
  auditInstance: Audit | null,
  filePath: string,
  expectedScore: number
): Promise<void> => {
  let result : Record<string, unknown> = { score: expectedScore === 1 ? 0 : 1 };

  if (page && auditInstance) {
    //check if is an external url
    const url = filePath.startsWith('http') ? filePath : `file://${filePath}`;

    await page.goto(url);
    await auditInstance.auditPage(page, page.url());
    result = await auditInstance.returnGlobal();
  }

  expect(result?.score).toEqual(expectedScore);
};
