import { Glob, sync } from "glob";
let gatherers: any | null = null;

await collectGatherers()

function extractFolderName(path: string) {
  const fileNameWithoutExtension = path.replace(/\.[^/.]+$/, '');
  const pathSegments = fileNameWithoutExtension.split('/');
  const folderName = pathSegments[pathSegments.length - 2];
  
  return folderName;
}

async function collectGatherers(): Promise<void> {

  try {
    if (!gatherers) {
      let files = sync('./src/gatherers/**/*.ts');
      gatherers = {};
      for (let file of files) {
        const moduleName = file.replace('src', 'dist').replace('.ts', '.js')
        const module = await import('../' + moduleName)

        const moduleId = extractFolderName(moduleName)

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

export {gatherers}
