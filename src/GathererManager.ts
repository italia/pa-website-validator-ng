import { Glob, sync } from "glob";
let gatherers: any | null = null;

await collectGatherers()

async function collectGatherers(): Promise<void> {

  try {
    if (!gatherers) {
      let files = sync('./src/gatherers/**/*.ts');
      gatherers = {};
      for (let file of files) {
        const moduleName = file.replace('src', 'dist').replace('.ts', '.js')
        const module = await import('../' + moduleName)

        const moduleId = file.split('/')?.pop()?.split('.')[0]

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
