import { sync } from "glob";
let gatherers: any | null = null;
import { getGatherers } from "./config/config.js";

function extractFolderName(path: string) {
  const fileNameWithoutExtension = path.replace(/\.[^/.]+$/, '');
  const systemFolderSeparator = process.platform as string == 'windows' ? '\\' : '/'
  const pathSegments = fileNameWithoutExtension.split(systemFolderSeparator);
  const folderName = pathSegments[pathSegments.length - 2];
  
  return folderName;
}

async function collectGatherers(): Promise<void> {
  const configGatherers = getGatherers()

  try {
    if (!gatherers) {
      let files = sync('./src/gatherers/**/*.ts');
      gatherers = {};
      for (let file of files) {
        const moduleName = file.replace('src', 'dist').replace('.ts', '.js')
        const moduleId = extractFolderName(moduleName)

        if (!configGatherers.includes(moduleId))
          continue

        const module = await import('../' + moduleName)

        if (moduleId){
          console.log('GATHERER MANAGER registered gatherer: '+ moduleId)
          gatherers[moduleId] = module.default
        }
      }
    }

  } catch (error) {
    console.error('Error gathering modules:', error);
    throw error;
  }
}

export { gatherers , collectGatherers} 
