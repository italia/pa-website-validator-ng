import {commonGatherersFolder} from "../../config/configFolderingConstants";
import {groups, accessibilityAudits, bestPracticeAudits, seoAudits, pwaAudits} from "../../config/commonAuditsParts";


module.exports = {
  extends: "lighthouse:default",
  settings: {
    onlyCategories: ["performance", "additionalTests"],
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
