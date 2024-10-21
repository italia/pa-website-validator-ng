# ![developers.italia](https://avatars1.githubusercontent.com/u/15377824?s=36&v=4 "developers.italia") App di valutazione dell'adesione ai modelli

#### Un applicativo desktop a supporto degli sviluppatori che aiuta a valutare la qualità dei siti istituzionali dei Comuni e delle scuole e la corrispondenza a molti dei criteri di conformità della misura 1.4.1 del PNRR Esperienza del cittadino nei servizi pubblici digitali.

Le App di valutazione sono strumenti che integrano la libreria [Lighthouse][lighthouse] ed effettuano test per la verifica della corretta adesione al [modello Comuni][modello-comuni] e al [modello scuole][modello-scuole] di Designers Italia.

[Scopri di più sulle App di valutazione][docs-app-valutazione].

## Funzionalità

- Possibilità di lanciare l'auditing su un sito web online o in locale.
- Possibilità di utilizzare il pacchetto come dipendenza global eseguendolo come cli-application.
- Possibilità di integrare il pacchetto come dipendenza NPM in progetti terzi.

## Test del modello Scuole

| Test                                      | Descrizione                                                                                                                                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Criteri di conformità per la misura 1.4.1 | Vengono mostrati i risultati degli audit relativi ai [criteri di conformità del modello scuole](https://docs.italia.it/italia/designers-italia/design-scuole-docs/it/versione-corrente/conformita-modello-scuola.html).                         |
| Raccomandazioni non abbligatorie          | Vengono mostrati i risultati degli audit relativi alle [raccomandazioni progettuali del modello scuole](https://docs.italia.it/italia/designers-italia/design-scuole-docs/it/versione-corrente/conformita-modello-scuola.html#raccomandazioni). |
| Test aggiuntivi                           | Vengono mostrati i risultati di test standard forniti da lighthouse. Non sono rilevanti in termini di raggiungimento dei criteri di conformità, ma rappresentano comunque indicazioni utili a valutare eventuali miglioramenti del sito.        |

## Test del modello Comuni

| Test                                                         | Descrizione                                                                                                                                                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conformità al modello di sito comunale - Cittadino informato | Vengono mostrati i risultati degli audit relativi ai [criteri di conformità per il sito comunale](https://docs.italia.it/italia/designers-italia/design-comuni-docs/it/versione-corrente/conformita/conformita-modello-sito.html).                        |
| Raccomandazioni non abbligatorie                             | Vengono mostrati i risultati degli audit relativi alle [raccomandazioni progettuali per il sito comunale](https://docs.italia.it/italia/designers-italia/design-comuni-docs/it/versione-corrente/conformita/conformita-modello-sito.html#raccomandazioni) |
| Lighthouse                                                   | Vengono mostrati i risultati di test standard forniti da lighthouse. Non sono rilevanti in termini di raggiungimento dei criteri di conformità, ma rappresentano comunque indicazioni utili a valutare eventuali miglioramenti del sito.                  |

## Report e messaggi in console

L'applicazione genera un report in stile Lighthouse del risultato della valutazione, che viene mostrato nel browser. Inoltre nella console dove è stato lanciato il comando vengono mostrati in tempo reale dei messaggi relativi agli audit che l'applicazione sta conducendo in quel momento, inclusi messaggi di errore; in particolare, per ogni pagina che viene caricata appariranno messaggi del tipo:

```console
...
SCAN  first-level  https://esempio.scuola.edu.it/: Gathering start
SCAN  first-level  https://esempio.scuola.edu.it/: Gathering end
SCAN  first-level  https://esempio.scuola.edu.it/: Auditing start
SCAN  first-level  https://esempio.scuola.edu.it/: Auditing end
...
```

che indicano rispettivamente:

- SCAN => messa in scansione la pagina x
- first-level => tipo di pagina messa in scansione
- https://esempio.scuola.edu.it/ => url
- Gathering => raccolta informazioni pagina
- Audit => controlli sulla pagina per superare i criteri ad essa connessi

## Tecnologie

PA Website Validator utilizza le seguenti tecnologie

- [Node.js] - Javascript runtime
- [npm] - Gestore di pacchetti
- [Lighthouse] - Libreria principale estesa per l'esecuzione degli audit
- [Typescript] - Linguaggio di programmazione fortemente tipizzato che si basa su JavaScript

## Requirements

PA Website Validator necessita [Node.js](https://nodejs.org/it/) v18+ (LTS), [npm] e [Google Chrome](https://www.google.com/chrome/).

## Plugins

PA Website validator utilizza le seguenti dipendenze esterne principali

| Plugin              | Repository                        |
| ------------------- | --------------------------------- |
| Lighthouse          | [GitHub][lighthouse-url]          |
| Yargs               | [GitHub][yargs-url]               |
| Puppeteer           | [GitHub][puppeteer-url]           |
| Cheerio             | [GitHub][cheerio-url]             |
| JSDOM               | [GitHub][jsdom-url]               |
| Geo Ip              | [GitHub][geoip-url]               |
| Get SSL Certificate | [GitHub][get-ssl-certificate-url] |

## Installazione locale

Per l'installazione locale, una volta clonato il repository, eseguire:

```console
cd DTD_Crawler
npm install
```

La directory `dist` sarà popolata con l’output del processo di build.

Utilizzo:

```console
node dist --type <type> --destination <folder> --report <report_name> --website <url> --scope <local|online> --view <true|false> --timeout <number> --number-of-service-pages <number> --concurrentPages <number>
```

Esempio:

```console
node dist --type school --destination ~/pa-italia-crawler-reports --report myreport --website https://www.ismonnet.edu.it/ --scope online --view false --accuracy all concurrentPages 10
```

## Installazione globale

Una volta effettuata l’installazione globale sarà possibile usare il comando `pa-website-validator-ng` dal terminale, senza dover entrare nella directory clonata. Questa è la procedura per installare il comando globalmente:

```console
cd pa-website-validator-ng
npm install
npm install -g --install-links
```

**NB**: Potrebbe essere necessario riavviare la shell/terminale per la propagazione del comando e la pulizia della cache npm:

```console
npm cache clean
```

Utilizzo:

```console
pa-website-validator-ng --type <type> --destination <folder> --report <report_name> --website <url> --scope <local|online> --view <boolean> --timeout <number> --number-of-service-pages <number> --concurrentPages <number>
```

Esempio:

```console
pa-website-validator-ng --type school --destination ~/pa-italia-crawler-reports --report myreport --website https://www.ismonnet.edu.it/ --scope online --view --accuracy all
```

## Opzioni comando

| Parametro Comando          | Descrizione                                                      | Obbligatorio | Possibili valori                  | Default     |
| -------------------------- | ---------------------------------------------------------------- | ------------ | --------------------------------- | ----------- |
| - -help                    | Mostra la mappa comando                                          | ❌           |                                   |             |
| - -version                 | Versione del pacchetto                                           | ❌           |                                   |             |
| - -type                    | Tipologia di crawler da lanciare                                 | ✅           | "municipality" "school"           |             |
| - -destination             | Folder dove salvare la reportistica                              | ✅           |                                   |             |
| - -report                  | Nome da assegnare al report                                      | ✅           |                                   |             |
| - -website                 | Url sito web da analizzare                                       | ✅           |                                   |             |
| - -scope                   | Scope di esecuzione                                              | ❌           | "local" "online"                  | "online"    |
| - -view                    | Visualizzazione istantanea report                                | ❌           |                                   |             |
| - -accuracy                | Definisce la morbosità della scansione                           | ✅           | "min", "suggested", "high", "all" | "suggested" |
| - -concurrentPages         | Definisce il numero di pagine in parallelo                       | ❌           |                                   | 20          |
| - -timeout                 | Definisce il timeout per dichiarare una pagina non raggiungibile | ❌           |                                   | 300000      |
| - -number-of-service-pages | Definisce il numero minimo di servizi da trovare                 | ❌           |                                   | 10          |

Note:

- `--type` indica quale tipologia di sito web viene passato da ispezionare (comunale o scolastico).

- `--scope` indica la tipologia di audit da eseguire:

  - `local` se il tool è lanciato su un sito web in ambiente locale: esegue tutti gli audit che lavorano sulla struttura del sito ispezionato e mostra dei messaggi informativi per alcuni audit che non producono risultati se eseguiti in un ambiente locale.
  - `online` esegue tutti gli audit disponibili.

- `--view` se passato al comando alla fine dell'auditing lancia un'istanza di chrome che mostra automaticamente la reportistica generata.
- `--accuracy` indica la precisione della scansione, definita come il numero di pagina analizzate:
  - `all` la scansione è effettuata su tutte le pagine disponibili.
- `--timeout` timeout utilizzato per dichiarare la pagina non raggiungibile
- `--concurrentPages` numero massimo di pagine di Puppeteer aperte in parallelo
- `--number-of-service-pages` numero minimo di pagine di servizio da trovare, per dichiarare superato il check sui servizi

[lighthouse]: https://www.npmjs.com/package/lighthouse
[node.js]: http://nodejs.org
[npm]: https://www.npmjs.com/
[typescript]: https://www.typescriptlang.org/
[yargs-url]: https://github.com/yargs/yargs
[lighthouse-url]: https://github.com/GoogleChrome/lighthouse
[puppeteer-url]: https://github.com/puppeteer/puppeteer
[cheerio-url]: https://github.com/cheeriojs/cheerio
[jsdom-url]: https://github.com/jsdom/jsdom
[geoip-url]: https://github.com/geoip-lite/node-geoip
[get-ssl-certificate-url]: https://github.com/johncrisostomo/get-ssl-certificate
[modello-comuni]: https://designers.italia.it/modello/comuni
[modello-scuole]: https://designers.italia.it/modello/scuole
[docs-app-valutazione]: https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs
[verifica-scuole]: https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs/it/versione-attuale/requisiti-e-modalita-verifica-scuole.html
[verifica-comuni]: https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs/it/versione-attuale/requisiti-e-modalita-verifica-comuni.html
[codici-http]: https://it.wikipedia.org/wiki/Codici_di_stato_HTTP
