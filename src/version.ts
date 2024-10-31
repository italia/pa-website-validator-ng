import { readFileSync } from "fs";
import path, { join } from "path";
import { fileURLToPath } from "url";

interface PackageJson {
  name: string;
  version: string;
}

function readPackageJson(): PackageJson {

  const packageJsonPath = join(path.dirname(fileURLToPath(import.meta.url)), "../package.json");

  const packageJsonString = readFileSync(packageJsonPath, "utf-8");

  const packageJson: PackageJson = JSON.parse(packageJsonString);

  return packageJson;
}

export default readPackageJson().version;
