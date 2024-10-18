import {groups, accessibilityAudits, bestPracticeAudits, seoAudits} from "../../config/commonAuditsParts";

module.exports = {
  extends: "lighthouse:default",
  settings: {
    onlyCategories: ["performance", "additionalTests"],
  },

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
      ],
    },
  },
};
