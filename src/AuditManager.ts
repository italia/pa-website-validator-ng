import { Glob, sync } from "glob";
let audits: any | null = null;

await collectAudits()

function extractFolderName(path: string) {
  const fileNameWithoutExtension = path.replace(/\.[^/.]+$/, '');
  const pathSegments = fileNameWithoutExtension.split('/');
  const folderName = pathSegments[pathSegments.length - 2];
  
  return folderName;
}

async function collectAudits(): Promise<void> {
  try {
    if (!audits) {
      let files = sync('./src/audits/**/index.ts');

      console.log(files)
      audits = {};
      for (let file of files) {
        const moduleName = file.replace('src', 'dist').replace('.ts', '.js')
        const module = await import('../' + moduleName)

        const moduleId = extractFolderName(moduleName)

        if (moduleId){
          console.log('AUDIT MANAGER registered audits: '+ moduleId)
          audits[moduleId] = module.default
        }
      }
    }

  } catch (error) {
    console.error('Error gathering modules:', error);
    throw error;
  }
}

export {audits}
