import {Audit} from "../Audit.js";
import {Page} from "puppeteer";
import {CheerioAPI} from "cheerio";
import * as cheerio from "cheerio";

const auditId = "municipality-performance-improvement-plan";

const improvementPlan = /piano di miglioramento del sito/i;

class ImprovementPlanAudit extends Audit {
  public score = 0;

  static get meta() {
    return {
      id: auditId,
      title: "Il sito ha un link al piano di miglioramento nel footer",
      failureTitle:
          "Il sito non ha un link al piano di miglioramento nel footer",
      description:
          "Nel caso in cui il sito comunale presenti livelli di performance (media pesata di 6 metriche standard) inferiori a 50, secondo quanto calcolato e verificato tramite le [librerie Lighthouse](https://web.dev/performance-scoring/), il Comune pubblica sul sito comunale un «Piano di miglioramento del sito» che mostri, per ciascuna voce che impatta negativamente la performance, le azioni future di miglioramento della performance stessa e le relative tempistiche di realizzazione attese. RIFERIMENTI TECNICI E NORMATIVI: [Documentazione del Modello Comuni](https://docs.italia.it/italia/designers-italia/design-comuni-docs/it/versione-corrente/index.html), [Documentazione delle App di valutazione](https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs/it/versione-attuale/requisiti-e-modalita-verifica-comuni.html#criterio-c-si-4-1-velocita-e-tempi-di-risposta).",
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
      page: Page | null
  ) {

    if (page) {
      let data = await page.content();
      let $: CheerioAPI = await cheerio.load(data);

      const footer = $("footer").text();

      if (footer.match(improvementPlan)) {
        this.score = 1;
        return {score: 1};
      } else {
        this.score = 0.5;
        return {score: 0.5};
      }
    }

  }

  async returnGlobal() {
    return this.score;
  }

  static getInstance(): Promise<ImprovementPlanAudit> {
    if (!ImprovementPlanAudit.instance) {
      ImprovementPlanAudit.instance = new ImprovementPlanAudit('', [], []);
    }
    return ImprovementPlanAudit.instance;
  }
}
