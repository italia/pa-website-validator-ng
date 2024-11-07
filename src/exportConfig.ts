import { config, ConfigInterface } from "./config/config.js";
import { extractFolderName } from "./AuditManager.js";
import { sync } from "glob";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import { Audit } from "./audits/Audit.js";
import {
  ConfigExportInterface,
  sortObjectByWeights,
} from "./report/Renderer.js";

async function recoverAudits(type: string) {
  const exportedConfig: ConfigInterface =
    config["online" as keyof typeof config][type as keyof typeof config.online];

  let auditIds: string[] = [];
  for (const pageTypeAudits of Object.values(exportedConfig.audits)) {
    auditIds = [...auditIds, ...(pageTypeAudits as string[])];
  }

  let audits: Record<string, () => Promise<Audit>> = {};

  try {
    const files = sync(
      path.dirname(fileURLToPath(import.meta.url)) + "/audits/**/index.**",
      {
        ignore: ["**/index.d.ts"],
      },
    );

    audits = {};
    for (const file of files) {
      const moduleName = file.replace(".ts", ".js");
      const moduleId = extractFolderName(moduleName);
      if (!auditIds.includes(moduleId)) continue;

      const module = await import(
        (process.platform as string) == "win32"
          ? "../" + moduleName
          : moduleName
      );
      if (moduleId) {
        console.log("AUDIT MANAGER registered audit: " + moduleId);
        audits[moduleId] = module.default;
      }
    }
  } catch (error) {
    console.error("Error auditing modules:", error);
    throw error;
  }

  const exportAudits: Record<string, ConfigExportInterface> = {};

  for (const auditId of Object.keys(audits)) {
    const audit = await audits[auditId]();
    const meta = await audit.meta();
    const folderName = audit.getFolderName();

    Object.keys(exportedConfig.audits).forEach((key) => {
      if (exportedConfig.audits[key].find((value) => value === folderName)) {
        exportAudits[meta.id] = {
          title: meta.mainTitle,
          code: meta.code,
          id: folderName,
          innerId: meta.id,
          weight: 0,
        };
      }
    });
  }

  return sortObjectByWeights(exportAudits, type);
}

export { recoverAudits };
