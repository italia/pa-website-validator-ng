import PageManager from "./PageManager.js";

import {PageData} from "./types/crawler-types.js";
import { initializeConfig } from "./config/config.js";
import { loadPage } from "./utils/utils.js";
import { Page } from "puppeteer";
import render from "./report/Renderer.js";
import { collectAudits } from "./AuditManager.js";
import { collectGatherers } from "./GathererManager.js";

const scan = async (
  pageData: PageData,
) => {
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
    }
    if (!config.audits[pageData.type]) {
      PageManager.setAudited(pageData.url, pageData.type);
      PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
    }

    if (!config.gatherers[pageData.type]) {
      PageManager.setGathered(pageData.url, pageData.type);
      PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
    }
    const pageTemp : PageData | undefined = PageManager.getPageByUrl(pageData.url, pageData.type);

    if(pageTemp){
      pageData = pageTemp;
    }

    /** GATHERING */
    let gathererPages: PageData[] = [];
    const gatheringErrors : string[] = [];

    if (
      !pageData.gathered ||
      (pageData.gathered && pageData.temporaryGatherer)
    ) {
      console.log(
        ` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering start`,
      );
      let navigatingError: string | unknown = '';

      let page: Page | null = null;
      if (!pageData.temporaryGatherer) {
        try {
          page = await loadPage(pageData.url);
          if (page) {
            await page.waitForNetworkIdle();
          }
        } catch (e) {
          navigatingError = e;
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
            throw new Error(
              pageData && pageData.errors && pageData.errors.length
                ? pageData.errors[0].toString()
                : `Page not available for type ${pageData.type}`,
            );
          }

          if (navigatingError) {
            console.log("navigating Error gatherer =", navigatingError);
            throw new Error(String(navigatingError));
          }

          const fetchedPages = await gatherer.navigateAndFetchPages(
            pageData.url,
            configAccuracy,
            "",
            page,
          );
          gathererPages = [...gathererPages, ...fetchedPages];
        } catch (e : unknown) {
          console.log(
            ` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`,
          );

          await PageManager.addPage({
            id: "",
            url: "https://temp" + gatherer.getPageType(),
            type: gatherer.getPageType(),
            redirectUrl: "",
            internal: false,
            gathered: true,
            audited: true,
            errors: [ e instanceof Error ? e.message : String(e)],
            temporaryGatherer: true,
            temporaryAudit: true,
          });
          gatheringErrors.push(e instanceof Error ? e.message : String(e));
        }
      }


      const pageTemp : PageData | undefined = await PageManager.setErrors(
          pageData.url,
          pageData.type,
          gatheringErrors,
          true,
      )

      if(pageTemp){
        pageData = pageTemp;
      }

      for (const gatheredPage of gathererPages) {
        await PageManager.addPage(gatheredPage);
      }

      PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);
      await PageManager.setGathered(pageData.url, pageData.type);
      console.log(
        ` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Gathering end`,
      );
      if (page) {
        await page.close();
      }
    }

    /** AUDITING */
    const auditingErrors = [];

    if (!pageData.audited || (pageData.audited && pageData.temporaryAudit)) {
      let navigatingError: string = '';

      let page: Page | null = null;
      console.log(
        ` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Audit start`,
      );
      if (!pageData.temporaryAudit) {
        try {
          page = await loadPage(pageData.url);
          if (page) {
            await page.waitForNetworkIdle();
          }
        } catch (e) {
          navigatingError = e instanceof Error ? e.message : String(e);
        }
      }

      if (config.audits[pageData.type]) {
        for (const auditId of config.audits[pageData.type]) {
          if (auditId !== "lighthouse" && auditId !== 'lighthouse_school') {
            if (!audits[auditId]) continue;
            const audit = await audits[auditId]();
            try {
              if (audit === undefined)
                throw new Error(
                  ` No audit found for id ${auditId}: check your configuration`,
                );

              const auditType = await audit.getType();
              await audit.auditPage(
                navigatingError ? null : page,
                pageData.url,
                pageData.errors && pageData.errors.length
                  ? pageData.errors[0]
                  : navigatingError
                    ? navigatingError
                    : "",
                pageData.type,
              );
              const result = await audit.returnGlobal();
              const meta = await audit.meta();

              await PageManager.setGlobalResults({
                [auditType]: { ...result, ...meta },
              });
            } catch (e) {
              console.log(
                ` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: ERROR`,
              );

              auditingErrors.push(e instanceof Error ? e.message : String(e));
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
        ` SCAN \x1b[32m ${pageData.type}\x1b[0m  ${pageData.url}: Auditing end`,
      );
    }

    await PageManager.setScanning(pageData.url, pageData.type, false);
    PageManager.setNotTemporaryAudit(pageData.url, pageData.type);
    PageManager.setNotTemporaryGatherer(pageData.url, pageData.type);

    await PageManager.closePage(pageData);

    if (!PageManager.hasRemainingPages()) {
      console.log("SCAN ENDED - navigated pages end:");

      results = await render();

      await PageManager.closeScript(results);
    }
  } catch (err) {
    console.log(`SCAN error: ${err}`);
  }

  if (results) {
    return results;
  }
};

export default scan;
