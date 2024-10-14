// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import defaultConfig from "lighthouse/lighthouse-core/config/default-config.js";

import {
  groups,
  accessibilityAudits,
  bestPracticeAudits,
  seoAudits,
  pwaAudits,
} from "./commonAuditsParts.js";
import {commonGatherersFolder} from "./configFolderingConstants.js";

export default {
  extends: "lighthouse:default",
  settings: {
    onlyCategories: [
      "performance",
      "additionalTests",
    ],
  },

  passes: [
    {
      gatherers: [
        commonGatherersFolder + "/originGatherer.js",
        commonGatherersFolder + "/hostnameGatherer.js",
        commonGatherersFolder + "/bootstrapItaliaCheckGatherer.js",
        commonGatherersFolder + "/bootstrapItaliaSelectorCheckGatherer.js",
      ],
    },
  ],

  groups: groups,

  categories: {
    additionalTests: {
      title: "Test aggiuntivi",
      description:
        "Vengono mostrati i risultati di test aggiuntivi utili a facilitare le attività di sviluppo e garantire un buon risultato.",
      auditRefs: [
        ...accessibilityAudits,
        ...bestPracticeAudits,
        ...seoAudits,
        ...pwaAudits,
      ],
    },
  },
};
