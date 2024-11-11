import PageManager from "./PageManager.js";

import { PageData } from "./types/crawler-types.js";
import { setTimeout } from "timers/promises";
import { initializeConfig } from "./config/config.js";
import { loadPage } from "./utils/utils.js";
import { Page } from "puppeteer";
import render from "./report/Renderer.js";
import { collectAudits } from "./AuditManager.js";
import { collectGatherers } from "./GathererManager.js";
import { DataElementError } from "./utils/DataElementError.js";

const scan = async (pageData: PageData) => {
  let results: Record<string, unknown> = {};
  try {
    const config = await initializeConfig();
    const gatherers = await collectGatherers();
    const audits = await collectAudits();

    await PageManager.setScanning(pageData.url, pageData.type, true);
    /** if no gathering or auditing for this page type skip*/

    if (!config.gatherers[pageData.type] && !config.audits[pageData.type]) {
      PageManager.setGathered(pageData.url, pageData.type);
      PageManager.setAudited(pageData.url, pageData.type);
      PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
      PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
      await PageManager.setScanning(pageData.url, pageData.type, false);
      await PageManager.closePage(pageData);
      if (!PageManager.hasRemainingPages()) {
        return;
      }
    }
    if (!config.audits[pageData.type]) {
      PageManager.setAudited(pageData.url, pageData.type);
      PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
    }

    if (!config.gatherers[pageData.type]) {
      PageManager.setGathered(pageData.url, pageData.type);
      PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
    }
    const pageTemp: PageData | undefined = PageManager.getPageByUrl(
      pageData.url,
      pageData.type,
    );

    if (pageTemp) {
      pageData = pageTemp;
    }

    /** GATHERING */
    let gathererPages: PageData[] = [];

    if (
      !pageData.gathered ||
      (pageData.gathered && pageData.temporaryGatherer)
    ) {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering start`,
      );
      let navigatingError: Error | string = "";

      let page: Page | null = null;
      if (!pageData.temporaryGatherer) {
        try {
          page = await loadPage(pageData.url);
          if (page) {
            await Promise.race([
              setTimeout(5000),
              page.waitForNetworkIdle({
                idleTime: 2000,
              }),
            ]);
          }
        } catch (e) {
          navigatingError = e instanceof Error ? e : String(e);
        }
      }

      for (const gathererId of config.gatherers[pageData.type]) {
        if (!gatherers[gathererId]) continue;

        const gatherer = await gatherers[gathererId]();
        try {
          if (gatherer === undefined)
            throw new Error(
              ` No gatherer found for id ${gathererId}: check your configuration`,
            );

          const accuracy = process.env["accuracy"] ?? "suggested";
          const configAccuracy = config.accuracy[accuracy];

          if (!page && pageData.temporaryGatherer) {
            const error: DataElementError | Error | string =
              pageData && pageData.errors && pageData.errors.length
                ? pageData.errors[0]
                : "";
            if (error instanceof DataElementError) {
              throw new DataElementError(error.message);
            } else if (error instanceof Error) {
              throw new Error(error.message);
            } else {
              throw new Error(`Page not available for type ${pageData.type}`);
            }
          }

          if (navigatingError) {
            console.log(
              `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} `,
              "navigating Error gatherer =",
              navigatingError,
            );
            throw new Error(
              navigatingError instanceof Error
                ? navigatingError.message
                : String(navigatingError),
            );
          }

          const fetchedPages = await gatherer.navigateAndFetchPages(
            pageData.url,
            configAccuracy,
            page,
          );
          gathererPages = [...gathererPages, ...fetchedPages];
        } catch (e) {
          console.log(
            `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`,
          );

          await PageManager.addPage({
            id: "",
            url: "https://temppagenotavailable/" + gatherer.getPageTitle(),
            type: gatherer.getPageType(),
            gathered: true,
            audited: true,
            errors: [
              e instanceof Error || e instanceof DataElementError
                ? e
                : String(e),
            ],
            temporaryGatherer: true,
            temporaryAudit: true,
          });
        }
      }

      for (const gatheredPage of gathererPages) {
        await PageManager.addPage(gatheredPage);
      }

      PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
      await PageManager.setGathered(pageData.url, pageData.type);
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering end`,
      );
      if (page) {
        await page.close();
      }
    }

    /** AUDITING */
    const auditingErrors = [];

    if (!pageData.audited || (pageData.audited && pageData.temporaryAudit)) {
      let navigatingError: Error | string = "";

      let page: Page | null = null;
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Auditing start`,
      );
      if (!pageData.temporaryAudit) {
        try {
          page = await loadPage(pageData.url);
          if (page) {
            await Promise.race([
              setTimeout(5000),
              page.waitForNetworkIdle({
                idleTime: 2000,
              }),
            ]);
          }
        } catch (e) {
          navigatingError = e instanceof Error ? e.message : String(e);
        }
      }

      if (config.audits[pageData.type]) {
        for (const auditId of config.audits[pageData.type]) {
          if (auditId !== "lighthouse" && auditId !== "lighthouse_school") {
            if (!audits[auditId]) continue;
            const audit = await audits[auditId]();
            try {
              if (audit === undefined)
                throw new Error(
                  ` No audit found for id ${auditId}: check your configuration`,
                );

              const auditType = await audit.getType();

              if (
                navigatingError ||
                (pageData.errors && pageData.errors.length)
              ) {
                if (navigatingError) {
                  await audit.returnErrors(
                    navigatingError,
                    pageData.url,
                    pageData.type,
                  );
                } else if (pageData.errors && pageData.errors.length) {
                  if (pageData.errors[0] instanceof DataElementError) {
                    await audit.returnErrors(
                      pageData.errors[0],
                      pageData.url,
                      pageData.type,
                      false,
                    );
                  } else {
                    await audit.returnErrors(
                      pageData.errors[0],
                      pageData.url,
                      pageData.type,
                    );
                  }
                }
              } else if (page) {
                await audit.auditPage(page, pageData.url, pageData.type);
              }
              const result = await audit.returnGlobal();
              const meta = await audit.meta();

              await PageManager.setGlobalResults({
                [auditType]: { ...result, ...meta },
              });
            } catch (e) {
              console.log(
                `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`,
              );

              if (audit === undefined)
                throw new Error(
                  ` No audit found for id ${auditId}: check your configuration`,
                );

              await audit.returnErrors(
                e instanceof DataElementError || e instanceof Error
                  ? e.message
                  : String(e),
                pageData.url,
                pageData.type,
                !(e instanceof DataElementError) && !(typeof e === "string"),
              );

              auditingErrors.push(
                e instanceof Error || e instanceof DataElementError
                  ? e.message
                  : String(e),
              );
            }
          }
        }

        if (page) {
          await page.close();
        }
      }

      PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
      PageManager.setErrors(pageData.url, pageData.type, auditingErrors);
      PageManager.setAudited(pageData.url, pageData.type);
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Auditing end`,
      );
    }

    await PageManager.setScanning(pageData.url, pageData.type, false);
    PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
    PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);

    await PageManager.closePage(pageData);

    if (!PageManager.hasRemainingPages()) {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN ENDED - navigated pages end:`,
        pageData.url,
        pageData.type,
      );

      results = await render();

      await PageManager.closeScript(results);
    }
  } catch (err) {
    console.log(
      `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} SCAN error: ${err}`,
    );
  }

  if (results) {
    return results;
  }
};

export default scan;
