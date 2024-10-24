import * as ejs from "ejs";
import { mkdir, writeFile } from "fs/promises";
import open from "open";
import path, { format } from "path";
import VERSION from "../version.js";
import PageManager from "../PageManager.js";
import { municipalityWeights, schoolWeights } from "../config/weights.js";
import { collectAudits } from "../AuditManager.js";
import { fileURLToPath } from "url";

const render = async () => {
  const website = process.env.website;
  const destination = process.env.destination;
  const saveFile = process.env.saveFile;
  const view = process.env.view;
  const reportName = process.env.reportName;
  const date = formatDate(new Date());

  let successAudits = [];
  let failedAudits = [];
  let informativeAudits = [];
  let lighthouseIFrame = null;
  let errorPages: Record<string, unknown>[] = [];

  const audits = await collectAudits();
  /** get data from report instances */
  for (const auditId of Object.keys(audits)) {
    if (auditId !== "municipality_improvement_plan") {
      const audit = await audits[auditId]();

      const auditMeta: Record<string, unknown> = await audit.meta();
      const auditResult = audit.globalResults;
      let score = auditResult.score;
      const infoScore = audit.infoScore;
      const error = auditResult.error;

      let improvementPlanHTML = "";
      let improvementPlanScore = 0;

      if (auditId === "lighthouse" && audits["municipality_improvement_plan"]) {
        const improvementAudit =
          await audits["municipality_improvement_plan"]();
        improvementPlanHTML = await improvementAudit.returnGlobalHTML();
        improvementPlanScore =
          score < 0.5 ? improvementAudit.globalResults.score : 0;
        score = improvementPlanScore > 0.5 && score < 0.5 ? 1 : score;
      }

      if (auditResult.info || audit.info) {
        informativeAudits.push({
          ...auditMeta,
          auditHTML: await audit.returnGlobalHTML(),
          status: infoScore
            ? ""
            : score > 0.5
              ? "pass"
              : score === 0.5
                ? "average"
                : "fail",
        });
      } else if (error) {
        failedAudits.push({
          ...auditMeta,
          status: "fail",
          auditHTML: (await audit.returnGlobalHTML()) + improvementPlanHTML,
        });
        if ("pagesInError" in audit.globalResults) {
          audit.globalResults.pagesInError.pages.forEach((p) => {
            errorPages.push({
              criteria: auditMeta.code + " - " + auditMeta.mainTitle,
              ...p,
              id: auditMeta.id,
            });
          });
        }
      } else if (score > 0.5) {
        if (improvementPlanScore > 0.5) {
          successAudits.push({
            ...auditMeta,
            status: "pass",
            auditHTML:
              (await audit.returnGlobalHTML(true)) + improvementPlanHTML,
          });
        } else {
          successAudits.push({
            ...auditMeta,
            status: "pass",
            auditHTML: (await audit.returnGlobalHTML()) + improvementPlanHTML,
          });
        }
      } else if (score === 0.5) {
        successAudits.push({
          ...auditMeta,
          status: "average",
          auditHTML: (await audit.returnGlobalHTML()) + improvementPlanHTML,
        });
      } else {
        failedAudits.push({
          ...auditMeta,
          status: "fail",
          auditHTML: (await audit.returnGlobalHTML()) + improvementPlanHTML,
        });
      }

      /** LIGHTHOUSE AUDIT specific flow */
      if (auditId === "lighthouse" || auditId === "lighthouse_school") {
        lighthouseIFrame = audit.reportHTML;
      }
    }
  }

  const reportJSON = await PageManager.getGlobalResults();

  let status = "ko";
  if (!failedAudits.length) {
    status = "ok";
  } else if (errorPages.length) {
    status = "x";
  }

  successAudits = sortByWeights(successAudits);
  failedAudits = sortByWeights(failedAudits);
  informativeAudits = sortByWeights(informativeAudits);
  errorPages = sortByWeights(errorPages).map((p) => {
    const keys = Object.keys(p);
    const obj: Record<string, unknown> = {};
    keys.forEach((k) => {
      if (k !== "weight" && k !== "id") {
        obj[k] = p[k];
      }
    });
    return obj;
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const reportHtml = await ejs.renderFile(__dirname + "/index.ejs", {
    crawler_version: VERSION,
    date: date,
    results: {
      status: status,
      passed_audits: successAudits.length,
      failed_audits: failedAudits.length,
      total_audits: successAudits.length + failedAudits.length,
    },
    audits: {
      passed: successAudits,
      info: informativeAudits,
      failed: failedAudits,
    },
    pagesInError: errorPages,
    url_comune: website,
    lighthouseIFrame: lighthouseIFrame,
  });

  if (saveFile == "false") {
    return {
      status: true,
      data: {
        htmlReport: reportHtml,
        jsonReport: JSON.stringify(reportJSON),
      },
    };
  }

  await mkdir(destination as string, { recursive: true });

  const htmlPath = format({
    dir: destination,
    name: reportName,
    ext: ".html",
  });

  const jsonPath = format({
    dir: destination,
    name: reportName,
    ext: ".json",
  });

  await writeFile(htmlPath, reportHtml);
  await writeFile(jsonPath, JSON.stringify(reportJSON));

  if (view && view === "true") {
    await open(htmlPath);
  }

  return {
    status: true,
    data: {
      htmlResultPath: htmlPath,
      jsonResultPath: jsonPath,
    },
  };
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year.slice(-2)} ${hours}:${minutes}`;
};

const sortByWeights = (audits: Record<string, unknown>[]) => {
  const referenceArray =
    process.env["type"] === "municipality"
      ? municipalityWeights
      : schoolWeights;

  audits.forEach((audit) => {
    const referenceItem = referenceArray.find((el) => el.id === audit.id);
    audit["weight"] =
      referenceItem && referenceItem.weight ? referenceItem.weight : 1;
  });

  return audits.sort((a, b) => Number(b.weight) - Number(a.weight));
};

export default render;
