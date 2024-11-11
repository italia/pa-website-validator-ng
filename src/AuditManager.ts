import { sync } from "glob";
import { getAudits } from "./config/config.js";
let audits: Record<string, () => Promise<Audit>> = {};
import { Audit } from "./audits/Audit.js";
import process from "process";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
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

      const searchPattern = path.posix.join(
        __dirname.replace(/\\/g, "/"),
        "audits",
        "**",
        "index.*",
      );

      const files = sync(searchPattern, {
        ignore: ["**/*.d.ts"],
      });

      audits = {};

      for (const file of files) {
        const moduleName = file.replace(".ts", ".js");
        const moduleId = extractFolderName(moduleName);

        if (!configAudits.includes(moduleId)) continue;
        const baseDir = path.resolve(
          process.cwd(),
          "node_modules/pa-website-validator-ng/dist/audits",
        );

        const modulePath = path.resolve(baseDir, moduleName);

        const moduleURL = pathToFileURL(modulePath).href;

        const module = await import(moduleURL);
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
export { collectAudits, extractFolderName };
