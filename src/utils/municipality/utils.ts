"use strict";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import { Page } from "puppeteer";
import { setTimeout } from "timers/promises";

import {
  customPrimaryMenuItemsDataElement,
  customSecondaryMenuItemsDataElement,
  primaryMenuItems,
} from "../../storage/municipality/menuItems.js";
import {
  buildUrl,
  cmsThemeRx,
  getHREFValuesDataAttribute,
  getRandomNString,
  getRedirectedUrl,
  isInternalUrl,
  loadPageData,
} from "../utils.js";
import { feedbackComponentStructure } from "../../storage/municipality/feedbackComponentStructure.js";
import axios from "axios";
import { DataElementError } from "../DataElementError.js";
import {
  RequestPages,
  PageLink,
  MunicipalitySecondLevelPages,
} from "../../types/crawler-types.js";
import { LRUCache } from "lru-cache";

const cacheResults = new LRUCache<string, string[]>({ max: 100 });

const getRandomFirstLevelPagesUrl = async (
  url: string,
  numberOfPages = 1,
  page: Page,
): Promise<string[]> => {
  const pages = await getFirstLevelPages(url, true, page);

  const pagesUrls = pages.map((page) => {
    return page.linkUrl;
  });

  return getRandomNString(pagesUrls, numberOfPages);
};

const getFirstLevelPages = async (
  url: string,
  custom: boolean,
  page: Page,
): Promise<PageLink[]> => {
  const data = await page.content();
  const $: CheerioAPI = await cheerio.load(data);
  let pagesUrls: PageLink[] = [];

  const menuDataElements = [];

  for (const [, value] of Object.entries(primaryMenuItems)) {
    menuDataElements.push(value.data_element);
  }

  if (custom) {
    menuDataElements.push(customPrimaryMenuItemsDataElement);
  }

  for (const value of menuDataElements) {
    const dataElement = `[data-element="${value}"]`;

    const elements = $(dataElement);
    const primaryLevelPageUrls = [];

    for (const element of elements) {
      let primaryLevelPageUrl = $(element).attr()?.href;
      if (
        primaryLevelPageUrl &&
        primaryLevelPageUrl !== "#" &&
        primaryLevelPageUrl !== ""
      ) {
        if (
          (await isInternalUrl(primaryLevelPageUrl)) &&
          !primaryLevelPageUrl.includes(url)
        ) {
          primaryLevelPageUrl = await buildUrl(url, primaryLevelPageUrl);
        }
        primaryLevelPageUrls.push({
          linkName: $(element).text().trim() ?? null,
          linkUrl: primaryLevelPageUrl,
        });
      }
    }

    if (
      primaryLevelPageUrls.length === 0 &&
      value !== customPrimaryMenuItemsDataElement
    ) {
      throw new DataElementError(value);
    }

    pagesUrls = [...pagesUrls, ...new Set(primaryLevelPageUrls)];
  }

  return pagesUrls;
};

const getRandomSecondLevelPagesUrl = async (
  url: string,
  numberOfPages = 1,
  page: Page,
): Promise<string[]> => {
  const data = await page.content();
  const $: CheerioAPI = await cheerio.load(data);

  let pagesUrls: string[] = [];

  const customMenuElement = {
    custom: {
      data_element: customPrimaryMenuItemsDataElement,
      secondary_item_data_element: customSecondaryMenuItemsDataElement,
    },
  };

  const menuItems = Object.assign({}, primaryMenuItems, customMenuElement);

  for (const [key, primaryMenuItem] of Object.entries(menuItems)) {
    const dataElement = `[data-element="${primaryMenuItem.data_element}"]`;

    const elements = $(dataElement);
    for (const element of elements) {
      let primaryLevelPageUrl = $(element).attr()?.href;
      if (
        primaryLevelPageUrl &&
        primaryLevelPageUrl !== "#" &&
        primaryLevelPageUrl !== ""
      ) {
        if (
          (await isInternalUrl(primaryLevelPageUrl)) &&
          !primaryLevelPageUrl.includes(url)
        ) {
          primaryLevelPageUrl = await buildUrl(url, primaryLevelPageUrl);
        }

        const $2 = await loadPageData(primaryLevelPageUrl);
        let secondPageUrls = [];

        let dataElementSecondary = "";

        if (key !== "live") {
          dataElementSecondary = primaryMenuItem.secondary_item_data_element[0];
          const dataElementSecondaryItem = `[data-element="${dataElementSecondary}"]`;
          secondPageUrls = await getHREFValuesDataAttribute(
            $2,
            dataElementSecondaryItem,
          );
        } else {
          for (const secondaryItemDataElement of primaryMenuItem.secondary_item_data_element) {
            dataElementSecondary = secondaryItemDataElement;
            const dataElementSecondaryItem = `[data-element="${secondaryItemDataElement}"]`;
            const buttonUrl = await getButtonUrl(
              $2,
              url,
              dataElementSecondaryItem,
            );
            if (buttonUrl !== "") {
              secondPageUrls.push(buttonUrl);
            }
          }
        }

        for (let i = 0; i < secondPageUrls.length; i++) {
          if (
            (await isInternalUrl(secondPageUrls[i])) &&
            !secondPageUrls[i].includes(primaryLevelPageUrl)
          ) {
            secondPageUrls[i] = await buildUrl(
              primaryLevelPageUrl,
              secondPageUrls[i],
            );
          }
        }

        if (secondPageUrls.length === 0 && key !== "custom") {
          throw new DataElementError(dataElementSecondary);
        }
        pagesUrls = [...pagesUrls, ...new Set(secondPageUrls)];
      }
    }
  }

  console.log(numberOfPages);

  return getRandomNString(pagesUrls, numberOfPages);
};

const getSecondLevelPages = async (
  url: string,
  custom: boolean,
): Promise<MunicipalitySecondLevelPages> => {
  const $ = await loadPageData(url);
  const pages: MunicipalitySecondLevelPages = {
    management: [],
    news: [],
    services: [],
    live: [],
    custom: [],
  };

  let menuItems = Object.assign({}, primaryMenuItems);

  if (custom) {
    const customMenuElement = {
      custom: {
        data_element: customPrimaryMenuItemsDataElement,
        secondary_item_data_element: customSecondaryMenuItemsDataElement,
      },
    };

    menuItems = Object.assign({}, primaryMenuItems, customMenuElement);
  }

  for (const [key, primaryMenuItem] of Object.entries(menuItems)) {
    const dataElement = `[data-element="${primaryMenuItem.data_element}"]`;

    const elements = $(dataElement);
    for (const element of elements) {
      let primaryLevelPageUrl = $(element).attr()?.href;
      if (
        primaryLevelPageUrl &&
        primaryLevelPageUrl !== "#" &&
        primaryLevelPageUrl !== ""
      ) {
        if (
          (await isInternalUrl(primaryLevelPageUrl)) &&
          !primaryLevelPageUrl.includes(url)
        ) {
          primaryLevelPageUrl = await buildUrl(url, primaryLevelPageUrl);
        }

        const $2 = await loadPageData(primaryLevelPageUrl);
        const secondPages = [];

        let dataElementSecondary = "";

        if (key !== "live") {
          dataElementSecondary = primaryMenuItem.secondary_item_data_element[0];
          const dataElementSecondaryItem = `[data-element="${dataElementSecondary}"]`;

          const elements = $2(dataElementSecondaryItem);
          for (const element of elements) {
            const elementObj = $2(element).attr();
            if (
              elementObj &&
              "href" in elementObj &&
              elementObj.href !== "#" &&
              elementObj.href !== ""
            ) {
              let secondPageUrl = elementObj.href;
              if (
                (await isInternalUrl(secondPageUrl)) &&
                !secondPageUrl.includes(primaryLevelPageUrl)
              ) {
                secondPageUrl = await buildUrl(
                  primaryLevelPageUrl,
                  secondPageUrl,
                );
              }

              secondPages.push({
                linkName: $(element).text().trim() ?? null,
                linkUrl: secondPageUrl,
              });
            }
          }
        } else {
          for (const [
            index,
            secondaryItemDataElement,
          ] of primaryMenuItem.secondary_item_data_element.entries()) {
            dataElementSecondary = secondaryItemDataElement;
            const dataElementSecondaryItem = `[data-element="${secondaryItemDataElement}"]`;
            let buttonUrl = await getButtonUrl(
              $2,
              url,
              dataElementSecondaryItem,
            );
            if (
              (await isInternalUrl(buttonUrl)) &&
              !buttonUrl.includes(primaryLevelPageUrl)
            ) {
              buttonUrl = await buildUrl(primaryLevelPageUrl, buttonUrl);
            }

            secondPages.push({
              linkName: primaryMenuItem.dictionary[index],
              linkUrl: buttonUrl,
            });
          }
        }

        if (secondPages.length === 0 && key !== "custom") {
          throw new DataElementError(dataElementSecondary);
        }

        pages[key as keyof MunicipalitySecondLevelPages] = secondPages;
      }
    }
  }
  return pages;
};

const getRandomThirdLevelPagesUrl = async (
  url: string,
  pageUrl: string,
  linkDataElement: string,
  numberOfPages = 1,
  page: Page,
) => {
  if (pageUrl.length === 0) {
    return [];
  }
  let $ = await loadPageData(url);

  try {
    let maxCountPages = 0;
    let clickButton = true;
    while (clickButton) {
      try {
        clickButton = await page.evaluate(() => {
          const button = document.querySelector(
            '[data-element="load-other-cards"]',
          ) as HTMLElement;
          if (!button) {
            return false;
          }
          button.click();
          return true;
        });

        if (!clickButton) {
          continue;
        }

        await Promise.race([
          setTimeout(10000),
          page.waitForNetworkIdle({
            idleTime: 2000,
          }),
        ]);

        const currentCountPages = (await page.$$(linkDataElement)).length;
        if (currentCountPages === maxCountPages) {
          clickButton = false;
          continue;
        }
        maxCountPages = currentCountPages;
      } catch (e) {
        console.log(e);
        clickButton = false;
      }
    }
    const data = await page.content();
    $ = cheerio.load(data);
  } catch (ex) {
    console.error(`ERROR ${pageUrl}: ${ex}`);
    throw new Error(
      `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`,
    );
  }

  let pagesUrls = await getHREFValuesDataAttribute($, linkDataElement);

  const pagesToBeAnalyzed = [pageUrl];
  const pagesAnalyzed = [];

  while (pagesToBeAnalyzed.length > 0) {
    let pageToBeAnalyzed: string = pagesToBeAnalyzed.pop() ?? "";
    if (
      (await isInternalUrl(pageToBeAnalyzed)) &&
      !pageToBeAnalyzed.includes(url)
    ) {
      pageToBeAnalyzed = await buildUrl(url, pageToBeAnalyzed);
    }

    $ = await loadPageData(pageToBeAnalyzed);
    pagesUrls = [
      ...pagesUrls,
      ...(await getHREFValuesDataAttribute($, linkDataElement)),
    ];

    pagesAnalyzed.push(pageToBeAnalyzed);

    const pagerPagesUrls = [
      ...new Set(
        await getHREFValuesDataAttribute($, '[data-element="pager-link"]'),
      ),
    ];
    for (const pagerPageUrl of pagerPagesUrls) {
      if (
        !pagesAnalyzed.includes(pagerPageUrl) &&
        !pagesToBeAnalyzed.includes(pagerPageUrl)
      ) {
        pagesToBeAnalyzed.push(pagerPageUrl);
      }
    }
  }

  pagesUrls = [...new Set(pagesUrls)];

  for (let i = 0; i < pagesUrls.length; i++) {
    if ((await isInternalUrl(pagesUrls[i])) && !pagesUrls[i].includes(url)) {
      pagesUrls[i] = await buildUrl(url, pagesUrls[i]);
    }
  }

  return getRandomNString(pagesUrls, numberOfPages);
};

const getPrimaryPageUrl = async (url: string, dataElement: string) => {
  const $ = await loadPageData(url);

  const pageElements = await getHREFValuesDataAttribute(
    $,
    `[data-element="${dataElement}"]`,
  );
  if (pageElements.length <= 0) {
    return "";
  }

  let pageUrl = pageElements[0];
  if ((await isInternalUrl(pageUrl)) && !pageUrl.includes(url)) {
    pageUrl = await buildUrl(url, pageUrl);
  }

  return pageUrl;
};

const checkFeedbackComponent = async (url: string, page: Page) => {
  const score = 1;
  const errors: string[] = [];

  let returnValues = {
    score: score,
    errors: errors,
  };

  try {
    returnValues = await page.evaluate(async (feedbackComponentStructure) => {
      let score = 1;
      const errors: string[] = [];

      const feedbackComponent = document.querySelector(
        `[data-element="${feedbackComponentStructure.component.dataElement}"]`,
      );
      if (!feedbackComponent) {
        errors.push(feedbackComponentStructure.component.missingError);
        score = 0;
        return {
          score: score,
          errors: errors,
        };
      }

      //Check title present
      const feedbackTitleElement = feedbackComponent.querySelector(
        `[data-element="${feedbackComponentStructure.title.dataElement}"]`,
      );
      if (!feedbackTitleElement) {
        if (score > 0.5) score = 0.5;
        errors.push(feedbackComponentStructure.title.missingError);
      }

      //Check title text
      if (
        feedbackTitleElement &&
        feedbackTitleElement.textContent &&
        feedbackTitleElement.textContent.trim().toLocaleLowerCase() !==
          feedbackComponentStructure.title.text.toLowerCase()
      ) {
        if (score > 0) score = 0;
        errors.push(feedbackComponentStructure.title.error);
      }

      //check input text
      const feedbackInputText = feedbackComponent.querySelector(
        `[data-element="${feedbackComponentStructure.input_text.dataElement}"]`,
      );
      if (!feedbackInputText) {
        if (score > 0.5) score = 0.5;
        errors.push(feedbackComponentStructure.input_text.missingError);
      }

      return {
        score: score,
        errors: errors,
      };
    }, feedbackComponentStructure);

    for (
      let i = 1;
      i <= feedbackComponentStructure.rate.numberOfComponents;
      i++
    ) {
      try {
        const feedbackComponentRate = await page.$(
          `[data-element="${feedbackComponentStructure.rate.dataElement + i}"]`,
        );
        await page.waitForNetworkIdle();
        await feedbackComponentRate?.click({
          delay: 500,
        });
        await page.waitForNetworkIdle();
      } catch {
        /* empty */
      }

      const feedbackReturnValue = await page.evaluate(
        async (feedbackComponentStructure, i: number) => {
          let score = 1;
          const errors: string[] = [];

          let existsRateComponents = false; //true if there is at least one rating inputs
          let checkRateComponent = true; //false if there are not the right amount of rating inputs
          let existsRatingQAComponents = true; //false if there is not a rating component (positive or negative)
          let checkRateComponentAssociation = true; //false if the association between rating input and rating components is incorrect

          let feedbackRatingPositiveElement = document.querySelector(
            `[data-element="${feedbackComponentStructure.positive_rating.dataElement}"]`,
          ) as HTMLElement;
          let feedbackRatingNegativeElement = document.querySelector(
            `[data-element="${feedbackComponentStructure.negative_rating.dataElement}"]`,
          ) as HTMLElement;

          const feedbackRateElement = document.querySelector(
            `[data-element="${
              feedbackComponentStructure.rate.dataElement + i
            }"]`,
          ) as HTMLElement;
          if (feedbackRateElement && !existsRateComponents) {
            existsRateComponents = true;
          }

          //errors.push(`item ${i}`);

          if (!feedbackRateElement) {
            checkRateComponent = false;
            if (!existsRateComponents) {
              if (score > 0.5) score = 0.5;
              errors.push(feedbackComponentStructure.rate.missingError);
            }

            if (existsRateComponents && !checkRateComponent) {
              if (score > 0) score = 0;
              errors.push(feedbackComponentStructure.rate.error);
            }

            if (!existsRatingQAComponents) {
              if (score > 0.5) score = 0.5;
            }

            if (existsRatingQAComponents && !checkRateComponentAssociation) {
              if (score > 0) score = 0;
              errors.push(feedbackComponentStructure.rate.errorAssociation);
            }

            return {
              score: score,
              errors: errors,
            };
          }

          if (
            !feedbackRatingPositiveElement ||
            !feedbackRatingNegativeElement
          ) {
            existsRatingQAComponents = false;
            checkRateComponentAssociation = false;
            if (!existsRateComponents) {
              if (score > 0.5) score = 0.5;
              errors.push(feedbackComponentStructure.rate.missingError);
            }

            if (existsRateComponents && !checkRateComponent) {
              if (score > 0) score = 0;
              errors.push(feedbackComponentStructure.rate.error);
            }

            if (!existsRatingQAComponents) {
              if (score > 0.5) score = 0.5;
            }

            if (existsRatingQAComponents && !checkRateComponentAssociation) {
              if (score > 0) score = 0;
              errors.push(feedbackComponentStructure.rate.errorAssociation);
            }

            return {
              score: score,
              errors: errors,
            };
          }

          feedbackRateElement.click();

          feedbackRatingPositiveElement = document.querySelector(
            `[data-element="${feedbackComponentStructure.positive_rating.dataElement}"]`,
          ) as HTMLElement;
          feedbackRatingNegativeElement = document.querySelector(
            `[data-element="${feedbackComponentStructure.negative_rating.dataElement}"]`,
          ) as HTMLElement;

          const feedbackPositiveRect =
            feedbackRatingPositiveElement.getBoundingClientRect();
          const feedbackPositiveStyle = window.getComputedStyle(
            feedbackRatingPositiveElement,
          );
          const feedbackPositiveVisible =
            //feedbackRatingPositiveElement.offsetParent &&
            feedbackPositiveStyle.visibility !== "hidden" &&
            feedbackPositiveRect.bottom > 0 &&
            feedbackPositiveRect.top > 0 &&
            feedbackPositiveRect.height > 0 &&
            feedbackPositiveRect.width > 0;

          const feedbackNegativeRect =
            feedbackRatingNegativeElement.getBoundingClientRect();
          const feedbackNegativeStyle = window.getComputedStyle(
            feedbackRatingNegativeElement,
          );
          const feedbackNegativeVisible =
            //feedbackRatingNegativeElement.offsetParent &&
            feedbackNegativeStyle.visibility !== "hidden" &&
            feedbackNegativeRect.bottom > 0 &&
            feedbackNegativeRect.top > 0 &&
            feedbackNegativeRect.height > 0 &&
            feedbackNegativeRect.width > 0;

          if (
            i <= feedbackComponentStructure.rate.positiveThreshold &&
            (feedbackPositiveVisible || !feedbackNegativeVisible)
          ) {
            checkRateComponentAssociation = false;
          }

          if (
            i > feedbackComponentStructure.rate.positiveThreshold &&
            (!feedbackPositiveVisible || feedbackNegativeVisible)
          ) {
            checkRateComponentAssociation = false;
          }

          if (i <= feedbackComponentStructure.rate.positiveThreshold) {
            if (!feedbackRatingNegativeElement) {
              if (score > 0.5) score = 0.5;
              errors.push(
                feedbackComponentStructure.negative_rating.missingError,
              );
            } else {
              const feedbackRatingNegativeQuestionElement =
                feedbackRatingNegativeElement.querySelector(
                  `[data-element="${feedbackComponentStructure.negative_rating.question.dataElement}"]`,
                );

              if (!feedbackRatingNegativeQuestionElement) {
                if (score > 0.5) score = 0.5;
                errors.push(
                  feedbackComponentStructure.negative_rating.question
                    .missingError,
                );
              }

              if (
                feedbackRatingNegativeQuestionElement &&
                feedbackRatingNegativeQuestionElement.textContent &&
                feedbackRatingNegativeQuestionElement.textContent
                  .trim()
                  .toLowerCase() !==
                  feedbackComponentStructure.negative_rating.question.text.toLowerCase()
              ) {
                if (score > 0) score = 0;
                errors.push(
                  feedbackComponentStructure.negative_rating.question.error,
                );
              }

              const feedbackRatingNegativeAnswersElements =
                feedbackRatingNegativeElement.querySelectorAll(
                  `[data-element="${feedbackComponentStructure.negative_rating.answers.dataElement}"]`,
                );

              if (feedbackRatingNegativeAnswersElements) {
                const feedbackRatingNegativeAnswers: string[] = [];

                for (const feedbackRatingNegativeAnswersElement of feedbackRatingNegativeAnswersElements) {
                  const feedbackAnswer =
                    feedbackRatingNegativeAnswersElement.textContent?.trim() ??
                    "";
                  feedbackRatingNegativeAnswers.push(feedbackAnswer);
                }

                const lowerCasedVocabulary =
                  feedbackComponentStructure.negative_rating.answers.texts.map(
                    (vocabularyElements: string) =>
                      vocabularyElements.toLowerCase(),
                  );

                let allCorrectAnswers = true;
                for (const feedbackRatingNegativeAnswer of feedbackRatingNegativeAnswers) {
                  if (
                    lowerCasedVocabulary.indexOf(
                      feedbackRatingNegativeAnswer.toLowerCase(),
                    ) === -1
                  ) {
                    allCorrectAnswers = false;
                  }
                }

                if (!feedbackRatingNegativeAnswersElements) {
                  if (score > 0.5) score = 0.5;
                  errors.push(
                    feedbackComponentStructure.negative_rating.answers
                      .missingError,
                  );
                }

                if (
                  feedbackRatingNegativeAnswersElements.length > 0 &&
                  !allCorrectAnswers
                ) {
                  if (score > 0) score = 0;
                  errors.push(
                    feedbackComponentStructure.negative_rating.answers.error,
                  );
                }
              }
            }
          }

          if (i > feedbackComponentStructure.rate.positiveThreshold) {
            if (!feedbackRatingPositiveElement) {
              if (score > 0.5) score = 0.5;
              errors.push(
                feedbackComponentStructure.positive_rating.missingError,
              );
            } else {
              const feedbackRatingPositiveQuestionElement =
                feedbackRatingPositiveElement.querySelector(
                  `[data-element="${feedbackComponentStructure.positive_rating.question.dataElement}"]`,
                );

              if (!feedbackRatingPositiveQuestionElement) {
                if (score > 0.5) score = 0.5;
                errors.push(
                  feedbackComponentStructure.positive_rating.question
                    .missingError,
                );
              }

              if (
                feedbackRatingPositiveQuestionElement &&
                feedbackRatingPositiveQuestionElement.textContent &&
                feedbackRatingPositiveQuestionElement.textContent
                  .trim()
                  .toLowerCase() !==
                  feedbackComponentStructure.positive_rating.question.text.toLowerCase()
              ) {
                if (score > 0) score = 0;
                errors.push(
                  feedbackComponentStructure.positive_rating.question.error,
                );
              }

              const feedbackRatingPositiveAnswersElements =
                feedbackRatingPositiveElement.querySelectorAll(
                  `[data-element="${feedbackComponentStructure.positive_rating.answers.dataElement}"]`,
                );

              if (feedbackRatingPositiveAnswersElements) {
                const feedbackRatingPositiveAnswers: string[] = [];

                for (const feedbackRatingPositiveAnswersElement of feedbackRatingPositiveAnswersElements) {
                  const feedbackAnswer =
                    feedbackRatingPositiveAnswersElement.textContent?.trim() ??
                    "";
                  feedbackRatingPositiveAnswers.push(feedbackAnswer);
                }

                const lowerCasedVocabulary =
                  feedbackComponentStructure.positive_rating.answers.texts.map(
                    (vocabularyElements: string) =>
                      vocabularyElements.toLowerCase(),
                  );

                let allCorrectAnswers = true;
                for (const feedbackRatingPositiveAnswer of feedbackRatingPositiveAnswers) {
                  if (
                    lowerCasedVocabulary.indexOf(
                      feedbackRatingPositiveAnswer.toLowerCase(),
                    ) === -1
                  ) {
                    allCorrectAnswers = false;
                  }
                }

                if (!feedbackRatingPositiveAnswersElements) {
                  if (score > 0.5) score = 0.5;
                  errors.push(
                    feedbackComponentStructure.positive_rating.answers
                      .missingError,
                  );
                }

                if (
                  feedbackRatingPositiveAnswersElements.length > 0 &&
                  !allCorrectAnswers
                ) {
                  if (score > 0) score = 0;
                  errors.push(
                    feedbackComponentStructure.positive_rating.answers.error,
                  );
                }
              }
            }
          }

          if (!existsRateComponents) {
            if (score > 0.5) score = 0.5;
            errors.push(feedbackComponentStructure.rate.missingError);
          }

          if (existsRateComponents && !checkRateComponent) {
            if (score > 0) score = 0;
            errors.push(feedbackComponentStructure.rate.error);
          }

          if (!existsRatingQAComponents) {
            if (score > 0.5) score = 0.5;
          }

          if (existsRatingQAComponents && !checkRateComponentAssociation) {
            if (score > 0) score = 0;
            errors.push(feedbackComponentStructure.rate.errorAssociation);
          }

          return {
            score: score,
            errors: errors,
          };
        },
        feedbackComponentStructure,
        i,
      );
      returnValues.errors = [
        ...returnValues.errors,
        ...feedbackReturnValue.errors,
      ];
      if (returnValues.score > feedbackReturnValue.score) {
        returnValues.score = feedbackReturnValue.score;
      }
    }
  } catch (ex) {
    console.error(`ERROR ${url}: ${ex}`);
    throw new Error(
      `Il test è stato interrotto perché nella prima pagina analizzata ${url} si è verificato l'errore "${ex}". Verificarne la causa e rifare il test.`,
    );
  }

  returnValues.errors = [...new Set(returnValues.errors)];

  return returnValues;
};

const getButtonUrl = async (
  $: CheerioAPI,
  url: string,
  dataElement: string,
) => {
  const button = $(dataElement).attr();
  if (
    button !== null &&
    button !== undefined &&
    "onclick" in button &&
    button.onclick.includes("location.href")
  ) {
    const onClick: string = button.onclick;
    let secondPageLink = onClick.substring(
      onClick.indexOf("'") + 1,
      onClick.lastIndexOf("'"),
    );
    if (!secondPageLink.includes(url)) {
      secondPageLink = await buildUrl(url, secondPageLink);
    }
    return secondPageLink;
  } else if (button !== null && button !== undefined && "href" in button) {
    // tag 'A'
    let secondPageLink = button.href;
    if (!secondPageLink.includes(url)) {
      secondPageLink = await buildUrl(url, secondPageLink);
    }
    return secondPageLink;
  }
  return "";
};

const isDrupal = async (url: string): Promise<boolean> => {
  const $: CheerioAPI = await loadPageData(url);
  const linkTags = $("link");

  let styleCSSUrl = "";
  for (const linkTag of linkTags) {
    if (!linkTag.attribs || !("href" in linkTag.attribs)) {
      continue;
    }

    if (linkTag.attribs.href.includes(".css")) {
      styleCSSUrl = linkTag.attribs.href;
      if ((await isInternalUrl(styleCSSUrl)) && !styleCSSUrl.includes(url)) {
        styleCSSUrl = await buildUrl(url, styleCSSUrl);
      }

      let CSScontent = "";
      try {
        const response = await axios.get(styleCSSUrl);
        CSScontent = response.data;
      } catch {
        CSScontent = "";
      }

      const match = CSScontent.match(cmsThemeRx);

      if (match === null || !match.groups) {
        continue;
      }

      if (match?.groups?.name?.toLowerCase() === "drupal") {
        return true;
      }
    }
  }

  return false;
};

const getPages = async (
  url: string,
  requests: RequestPages[],
  removeExternal = true,
  page: Page,
): Promise<string[]> => {
  let pagesUrl: string[] = [];
  const missingDataElements: string[] = [];

  for (const request of requests) {
    try {
      let requestedPages = cacheResults.get(
        request.type + "-" + request.numberOfPages,
      );
      if (requestedPages === undefined) {
        switch (request.type) {
          case "first_level_pages": {
            requestedPages = await getRandomFirstLevelPagesUrl(
              url,
              request.numberOfPages,
              page,
            );
            break;
          }
          case "second_level_pages": {
            requestedPages = await getRandomSecondLevelPagesUrl(
              url,
              request.numberOfPages,
              page,
            );
            break;
          }
          case "services_page": {
            const servicesPage = await getPrimaryPageUrl(
              url,
              primaryMenuItems.services.data_element,
            );
            if (servicesPage === "") {
              throw new DataElementError(
                primaryMenuItems.services.data_element,
              );
            }
            requestedPages = [servicesPage];
            break;
          }
          case "services": {
            const allServicePage = await getPrimaryPageUrl(
              url,
              primaryMenuItems.services.data_element,
            );
            if (allServicePage.length === 0) {
              throw new DataElementError(
                primaryMenuItems.services.data_element,
              );
            }

            const randomServicesUrl = await getRandomThirdLevelPagesUrl(
              url,
              allServicePage,
              `[data-element="${primaryMenuItems.services.third_item_data_element}"]`,
              request.numberOfPages,
              page,
            );
            if (randomServicesUrl.length === 0) {
              throw new DataElementError(
                primaryMenuItems.services.third_item_data_element,
              );
            }
            requestedPages = randomServicesUrl;
            break;
          }
          case "events": {
            requestedPages = await getRandomThirdLevelPagesUrl(
              url,
              await getButtonUrl(
                await loadPageData(
                  await getPrimaryPageUrl(
                    url,
                    primaryMenuItems.live.data_element,
                  ),
                ),
                url,
                `[data-element="${primaryMenuItems.live.secondary_item_data_element[1]}"]`,
              ),
              `[data-element="${primaryMenuItems.live.third_item_data_element}"]`,
              request.numberOfPages,
              page,
            );

            break;
          }
          case "booking_appointment": {
            const servicesPage = await getPrimaryPageUrl(
              url,
              primaryMenuItems.services.data_element,
            );
            if (servicesPage === "") {
              throw new DataElementError(
                primaryMenuItems.services.data_element,
              );
            }

            const bookingAppointmentPage = await getPrimaryPageUrl(
              servicesPage,
              "appointment-booking",
            );
            if (bookingAppointmentPage === "") {
              throw new DataElementError("appointment-booking");
            }
            requestedPages = [bookingAppointmentPage];
            break;
          }
          case "personal_area_login": {
            const personalAreaLoginPageUrl = await getPrimaryPageUrl(
              url,
              "personal-area-login",
            );
            if (personalAreaLoginPageUrl !== "") {
              requestedPages = [personalAreaLoginPageUrl];
            } else {
              requestedPages = [];
            }
            break;
          }
          default:
            requestedPages = [];
        }
        cacheResults.set(
          request.type + "-" + request.numberOfPages,
          requestedPages,
        );
      }
      pagesUrl = [...pagesUrl, ...requestedPages];
    } catch (ex) {
      if (!(ex instanceof DataElementError)) {
        throw ex;
      }

      missingDataElements.push(ex.message);
    }
  }

  if (missingDataElements.length > 0) {
    throw new DataElementError(missingDataElements.join(", "));
  }

  const host = new URL(url).hostname.replace("www.", "");

  pagesUrl = [...new Set(pagesUrl)];

  const redirectedPages: string[] = [];
  for (const pageUrl of pagesUrl) {
    const redirectedUrl = await getRedirectedUrl(pageUrl);
    const redirectedHost = new URL(redirectedUrl).hostname.replace("www.", "");

    if (!removeExternal || redirectedHost.includes(host)) {
      redirectedPages.push(redirectedUrl);
    }
  }

  return redirectedPages;
};

export {
  getRandomFirstLevelPagesUrl,
  getRandomSecondLevelPagesUrl,
  getRandomThirdLevelPagesUrl,
  checkFeedbackComponent,
  getPrimaryPageUrl,
  getButtonUrl,
  isDrupal,
  getPages,
  getFirstLevelPages,
  getSecondLevelPages,
};
