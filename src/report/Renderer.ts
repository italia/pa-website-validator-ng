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
  let errorAudits = [];
  let failedAudits = [];
  let informativeAudits = [];
  let lighthouseIFrame = null;

  const audits = await collectAudits();
  /** get data from report instances */
  for (const auditId of Object.keys(audits)) {
    if (auditId !== "municipality_improvement_plan") {
      const audit = await audits[auditId]();

      const auditMeta = await audit.meta();
      const auditResult = audit.globalResults;
      const score = auditResult.score;
      const infoScore = audit.infoScore;
      const error = auditResult.error;

      let improvementPlanHTML = "";

      if (auditId === "lighthouse" && audits["municipality_improvement_plan"]) {
        const improvementAudit =
          await audits["municipality_improvement_plan"]();
        improvementPlanHTML = await improvementAudit.returnGlobalHTML();
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
        errorAudits.push({
          ...auditMeta,
          status: "fail",
          auditHTML: (await audit.returnGlobalHTML()) + improvementPlanHTML,
        });
      } else if (score > 0.5) {
        successAudits.push({
          ...auditMeta,
          status: "pass",
          auditHTML: (await audit.returnGlobalHTML()) + improvementPlanHTML,
        });
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
  if (!failedAudits.length && !errorAudits.length) {
    status = "ok";
  } else if (errorAudits.length) {
    status = "x";
  }

  successAudits = sortByWeights(successAudits);
  failedAudits = sortByWeights(failedAudits);
  informativeAudits = sortByWeights(informativeAudits);
  errorAudits = sortByWeights(errorAudits);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const reportHtml = await ejs.renderFile(__dirname + "/index.ejs", {
    crawler_version: VERSION,
    date: date,
    results: {
      status: status,
      error_audits: errorAudits.length,
      passed_audits: successAudits.length,
      failed_audits: failedAudits.length,
      total_audits:
        successAudits.length + failedAudits.length + errorAudits.length,
    },
    audits: {
      error: errorAudits,
      passed: successAudits,
      info: informativeAudits,
      failed: failedAudits,
    },
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
