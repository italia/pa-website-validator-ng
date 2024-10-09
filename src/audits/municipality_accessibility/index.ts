"use strict";

import { auditDictionary } from "../../storage/auditDictionary.js";
import {A11yAudit} from "../accessibility/index.js";

class MunicipalityA11yAudit extends A11yAudit {

  code = 'C.SI.3.2'
  mainTitle = 'DICHIARAZIONE DI ACCESSIBILITÀ '
  mainDescription = 'Il sito della scuola deve esporre la dichiarazione di accessibilità'
  minRequirement = "il sito presenta una voce nel footer che riporta a una dichiarazione di accessibilità AgID valida per il sito;"
  automaticChecks = 'ricercando uno specifico attributo "data-element" come spiegato nella Documentazione delle App di valutazione, viene verificata la presenza del link nel footer, che riporti a una pagina esistente, che l\'url della pagina di destinazione inizi con "https://form.agid.gov.it/view/" e che la pagina contenga l\'url del sito della scuola; RIFERIMENTI TECNICI E NORMATIVI: [Documentazione del Modello scuole](https://docs.italia.it/italia/designers-italia/design-scuole-docs), [AgID Linee guida sull’accessibilità degli strumenti informatici](https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/), [Direttiva UE n. 2102/2016](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A32016L2102), [Legge 9 gennaio 2004 n. 4](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.dataPubblicazioneGazzetta=2004-01-17&atto.codiceRedazionale=004G0015&atto.articolo.numero=0&atto.articolo.sottoArticolo=1&atto.articolo.sottoArticolo1=10&qId=cb6b9a05-f5c3-40ac-81b8-f89e73e5b4c7&tabID=0.029511124589268523&title=lbl.dettaglioAtto), [Web Content Accessibility Guidelines WCAG 2.1](https://www.w3.org/Translations/WCAG21-it/#background-on-wcag-2), [AgID dichiarazione di accessibilità](https://www.agid.gov.it/it/design-servizi/accessibilita/dichiarazione-accessibilita), [Documentazione delle App di valutazione](https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs/).'
  failures = "Elementi di fallimento:"

  auditId = "municipality-legislation-accessibility-declaration-is-present";
  auditData = auditDictionary["municipality-legislation-accessibility-declaration-is-present"];

  static getInstance(): Promise<MunicipalityA11yAudit> {
    if (!MunicipalityA11yAudit.instance) {
      MunicipalityA11yAudit.instance = new MunicipalityA11yAudit('',[],[]);
    }
    return MunicipalityA11yAudit.instance;
  }

}

export {MunicipalityA11yAudit};
export default MunicipalityA11yAudit.getInstance;

