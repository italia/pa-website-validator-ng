"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import { A11yAudit } from "../accessibility/index.js";
import * as ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

class SchoolA11yAudit extends A11yAudit {
  code = "C.SC.2.2";
  mainTitle = "DICHIARAZIONE DI ACCESSIBILITÀ ";
  mainDescription =
    "Il sito della scuola deve esporre la dichiarazione di accessibilità";
  minRequirement =
    "il sito presenta una voce nel footer che riporta a una dichiarazione di accessibilità AgID valida per il sito;";
  automaticChecks =
    'ricercando uno specifico attributo "data-element" come spiegato nella Documentazione delle App di valutazione, viene verificata la presenza del link nel footer, che riporti a una pagina esistente, che l\'url della pagina di destinazione inizi con "https://form.agid.gov.it/view/" e che la pagina contenga l\'url del sito della scuola; RIFERIMENTI TECNICI E NORMATIVI: [Documentazione del Modello scuole](https://docs.italia.it/italia/designers-italia/design-scuole-docs), [AgID Linee guida sull’accessibilità degli strumenti informatici](https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/), [Direttiva UE n. 2102/2016](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A32016L2102), [Legge 9 gennaio 2004 n. 4](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.dataPubblicazioneGazzetta=2004-01-17&atto.codiceRedazionale=004G0015&atto.articolo.numero=0&atto.articolo.sottoArticolo=1&atto.articolo.sottoArticolo1=10&qId=cb6b9a05-f5c3-40ac-81b8-f89e73e5b4c7&tabID=0.029511124589268523&title=lbl.dettaglioAtto), [Web Content Accessibility Guidelines WCAG 2.1](https://www.w3.org/Translations/WCAG21-it/#background-on-wcag-2), [AgID dichiarazione di accessibilità](https://www.agid.gov.it/it/design-servizi/accessibilita/dichiarazione-accessibilita), [Documentazione delle App di valutazione](https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs/).';
  auditId = "school-legislation-accessibility-declaration-is-present";
  auditData =
    auditDictionary["school-legislation-accessibility-declaration-is-present"];

  failures = "Elementi di fallimento:";
  greenResult = "Il link è nel footer e invia alla pagina corretta.";
  yellowResult = "";

  redResult =
    "Il link non è nel footer o non invia alla pagina corretta o la pagina non esiste.";
  nonExecuted =
    "Uno o più data-element necessari per condurre il test non sono stati trovati. Verifica il capitolo sui Requisiti tecnici nella Documentazione delle App di valutazione per risolvere il problema.";
  title =
    "C.SC.2.2 - © - Il sito della scuola deve esporre la dichiarazione di accessibilità.";
  failureTitle =
    "C.SC.2.2 - DICHIARAZIONE DI ACCESSIBILITÀ - Il sito della scuola deve esporre la dichiarazione di accessibilità.";
  description = "CONDIZIONI DI SUCCESSO:  MODALITÀ DI VERIFICA: ";

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      mainDescription: this.mainDescription,
      minRequirement: this.minRequirement,
      automaticChecks: this.automaticChecks,
      failures: this.failures,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.BINARY,
      requiredArtifacts: ["origin"],
    };
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.globalResults.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else if (this.globalResults.score == 0.5) {
      status = "average";
      message = this.auditData.yellowResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    return await ejs.renderFile(__dirname + "/template.ejs", {
      ...(await this.meta()),
      code: this.code,
      table: this.globalResults,
      status,
      statusMessage: message,
      metrics: null,
      totalPercentage: null,
    });
  }

  static getInstance(): SchoolA11yAudit {
    if (!SchoolA11yAudit.instance) {
      SchoolA11yAudit.instance = new SchoolA11yAudit();
    }
    return <SchoolA11yAudit>SchoolA11yAudit.instance;
  }
}

export { SchoolA11yAudit };
export default SchoolA11yAudit.getInstance;
