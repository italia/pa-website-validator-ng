"use strict";

import {Cookie, Page, Protocol} from "puppeteer";
import crawlerTypes from "../types/crawler-types";
import cookie = crawlerTypes.cookie;

const CookieAudit = async (
  page: Page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
  const items = [];
  let score = 1;

  let cookies: Cookie[] = await page.cookies();
  const resultCookies = await checkCookieDomain(page.url(), cookies);

  for (const resultCookie of resultCookies) {
    if (!resultCookie.is_correct) {
      score = 0;
    }

    items.push(resultCookie);
  }

  return {
    score: score,
    items: items,
  };
};

async function checkCookieDomain(
  url: string,
  cookies: Cookie[]
): Promise<cookie[]> {
  const returnValue = [];

  for (const cookie of cookies) {
    const cookieValues = {
      inspected_page: url,
      cookie_name: cookie.name,
      cookie_value: cookie.value,
      cookie_domain: cookie.domain,
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

export { CookieAudit };
