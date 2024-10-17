import { sync } from "glob";
import { getGatherers } from "./config/config.js";
import * as process from "process";
import { fileURLToPath } from "url";
import path from "path";
import {Gatherer} from "./gatherers/Gatherer.js";

let gatherers: Record<string, () => Promise<Gatherer>> = {};

function extractFolderName(path: string) {
  const fileNameWithoutExtension = path.replace(/\.[^/.]+$/, "");
  const systemFolderSeparator =
    (process.platform as string) == "windows" ? "\\" : "/";
  const pathSegments = fileNameWithoutExtension.split(systemFolderSeparator);
  return pathSegments[pathSegments.length - 2];
}

async function collectGatherers() {
  const configGatherers = await getGatherers();

  try {
    if (!Object.keys(gatherers).length) {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));

      const files = sync(__dirname + "/gatherers/**/*.**");

      gatherers = {};
      for (const file of files) {
        const moduleName = file.replace(".ts", ".js");
        const moduleId = extractFolderName(moduleName);
        if (!configGatherers.includes(moduleId)) continue;
        const module = await import(moduleName);
        if (moduleId) {
          console.log("GATHERER MANAGER registered gatherer: " + moduleId);
          gatherers[moduleId] = module.default;
        }
      }
    }
  } catch (error) {
    console.error("Error gathering modules:", error);
    throw error;
  }

  return gatherers;
}

export { collectGatherers };
