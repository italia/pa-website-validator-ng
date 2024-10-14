"use strict";

import { dirname } from "path";
import { fileURLToPath } from "url";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

const gatherersFolder = __dirname + "/../lighthouse/gatherers";

export const commonGatherersFolder = gatherersFolder + "/common";
