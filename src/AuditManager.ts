import { sync } from "glob";
import { getAudits } from "./config/config.js";
import { fileURLToPath } from "url";
import path from "path";
let audits: Record<string, () => Promise<Audit>> = {};
import { Audit } from "./audits/Audit.js";
import process from "process";

function extractFolderName(path: string) {
  const fileNameWithoutExtension = path.replace(/\.[^/.]+$/, "");
  const systemFolderSeparator =
    (process.platform as string) == "win32" ? "\\" : "/";
  const pathSegments = fileNameWithoutExtension.split(systemFolderSeparator);
  return pathSegments[pathSegments.length - 2];
}

async function collectAudits() {
  const configAudits = await getAudits();
  try {
    if (!Object.keys(audits).length) {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));

      const files = sync(__dirname + "/audits/**/index.**");

      audits = {};
      for (const file of files) {
        const moduleName = file.replace(".ts", ".js");
        const moduleId = extractFolderName(moduleName);
        if (!configAudits.includes(moduleId)) continue;

        const module = await import((process.platform as string) == "win32" ? '../' + moduleName : moduleName);
        if (moduleId) {
          console.log("AUDIT MANAGER registered audit: " + moduleId);
          audits[moduleId] = module.default;
        }
      }
    }
  } catch (error) {
    console.error("Error auditing modules:", error);
    throw error;
  }

  return audits;
}

export { collectAudits };
