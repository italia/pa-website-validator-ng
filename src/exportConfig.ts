import { initializeConfig } from "./config/config.js";
import { collectAudits } from "./AuditManager.js";

async function recoverAudits(type: string) {
  const config = await initializeConfig(type, "online");
  const audits = await collectAudits();

  const exportAudits: Record<string, unknown> = {};

  for (const auditId of Object.keys(audits)) {
    const audit = await audits[auditId]();
    const meta = await audit.meta();
    const folderName = audit.getFolderName();

    Object.keys(config.audits).forEach((key) => {
      if (config.audits[key].find((value) => value === folderName)) {
        exportAudits[meta.id] = {
          title: meta.title,
          id: folderName,
        };
      }
    });
  }

  return exportAudits;
}

export { recoverAudits };
