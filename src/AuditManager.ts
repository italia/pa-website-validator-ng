import { sync } from "glob";
let audits: any | null = null;
import { getAudits } from "./config/config.js";

function extractFolderName(path: string) {
  const fileNameWithoutExtension = path.replace(/\.[^/.]+$/, '');
  const systemFolderSeparator = process.platform as string == 'windows' ? '\\' : '/'
  const pathSegments = fileNameWithoutExtension.split(systemFolderSeparator);
  const folderName = pathSegments[pathSegments.length - 2];
  
  return folderName;
}

async function collectAudits(): Promise<void> {
  const configAudits = getAudits()
  try {
    if (!audits) {
      let files = sync('./src/audits/**/index.ts');

      audits = {};
      for (let file of files) {
        const moduleName = file.replace('src', 'dist').replace('.ts', '.js')
        const moduleId = extractFolderName(moduleName)

        if (!configAudits.includes(moduleId))
          continue

        const module = await import('../' + moduleName)

        if (moduleId){
          console.log('AUDIT MANAGER registered audit: '+ moduleId)
          audits[moduleId] = module.default
        }
      }
    }

  } catch (error) {
    console.error('Error auditing modules:', error);
    throw error;
  }
}

export { audits , collectAudits }
