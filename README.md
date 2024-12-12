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
L'applicativo necessita un computer con almeno 16GB di RAM per una corretta esecuzione.

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
node --max-old-space-size=8192 dist --type <type> --destination <folder> --report <report_name> --website <url> --scope <local|online> --view <true|false> --timeout <number> --number-of-service-pages <number> --concurrentPages <number>
```

Esempio:

```console
node --max-old-space-size=8192 dist --type school --destination ~/pa-italia-crawler-reports --report myreport --website https://www.ismonnet.edu.it/ --scope online --view false --accuracy all concurrentPages 10
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
pa-website-validator-ng --max-old-space-size=8192 --type <type> --destination <folder> --report <report_name> --website <url> --scope <local|online> --view <boolean> --timeout <number> --number-of-service-pages <number> --concurrentPages <number>
```

Esempio:

```console
pa-website-validator-ng --max-old-space-size=8192 --type school --destination ~/pa-italia-crawler-reports --report myreport --website https://www.ismonnet.edu.it/ --scope online --view --accuracy all
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
| - -view                    | Visualizzazione istantanea report                                | ❌           | "true","false"                    | "false"     |
| - -accuracy                | Definisce la morbosità della scansione                           | ✅           | "min", "suggested", "high", "all" | "suggested" |
| - -concurrentPages         | Definisce il numero di pagine in parallelo                       | ❌           |                                   | 20          |
| - -timeout                 | Definisce il timeout per dichiarare una pagina non raggiungibile | ❌           |                                   | 300000      |
| - -number-of-service-pages | Definisce il numero minimo di servizi da trovare                 | ❌           |                                   | 10          |

Note:

- `--type` indica quale tipologia di sito web viene passato da ispezionare (comunale o scolastico).

- `--scope` indica la tipologia di audit da eseguire:

  - `local` se il tool è lanciato su un sito web in ambiente locale: esegue tutti gli audit che lavorano sulla struttura del sito ispezionato e mostra dei messaggi informativi per alcuni audit che non producono risultati se eseguiti in un ambiente locale.
  - `online` esegue tutti gli audit disponibili.

- `--view` indica se alla fine dell'auditing deve essere lanciata un'istanza di chrome che mostra automaticamente la reportistica generata.
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

### Configurazione dello User Agent

Per garantire che l'applicativo venga rilevato come un browser standard, lo User Agent di Puppeteer viene impostato con la seguente stringa:

```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
```

Questo è utile per evitare blocchi da parte di alcuni siti web e per simulare un comportamento di navigazione tipico.

## Test e Validazione

Questo applicativo utilizza [Jest](https://jestjs.io/) come framework di testing per garantire che le funzionalità siano correttamente implementate e che ogni aggiornamento del codice non introduca regressioni.

### Esecuzione dei Test

Per eseguire i test è sufficiente utilizzare il comando:

```console
npm run test
```

Questo comando eseguirà tutti i test definiti, fornendo un report dettagliato sui risultati e mostrando eventuali errori.

### Test che richiedono un server locale

Alcuni test necessitano che un server locale sia in esecuzione per poter accedere alle risorse richieste durante i test. Per avviare il server locale, utilizza il seguente comando:

```console
npm run test:server
```

Questo comando avvia il server, permettendo l’esecuzione dei test che necessitano di una configurazione di rete locale. Una volta attivato il server, puoi eseguire i test normalmente con npm run test.

### Esempio di Output dei Test

Quando esegui i test con Jest, potresti vedere un output simile nel terminale:

```bash
> pa-website-validator-ng@1.0.5 test
> jest --detectOpenHandles --forceExit

 PASS  src/audits/school_theme/__test__/audit.test.ts (13.03 s)
  school_theme
    ✅  pass (5850 ms)
    ✅  fail (2505 ms)
    ✅  fail:0.5 (231 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        13.11 s
```

In questo esempio:

- **PASS** indica che il test suite (school_theme) è passato.
- Ogni test ha un indicatore ✅ per mostrare che è stato completato con successo, assieme al tempo di esecuzione (in millisecondi).
- **Test Suites**: Riporta il numero di suite di test completate con successo (in questo caso, 1 passed).
- **Tests**: Riporta il numero totale di test passati rispetto al totale eseguito (ad es. 3 passed, 3 total).

### Esempio di Test con Fallimento

Se uno o più test non dovessero superare i criteri previsti, l’output potrebbe apparire come segue:

```bash
> pa-website-validator-ng@1.0.5 test
> jest --detectOpenHandles --forceExit

 FAIL  src/audits/school_theme/__test__/audit.test.ts (6.041 s)
  school_theme
    ✅ pass (1285 ms)
    ❌ fail (939 ms)
    ✅ fail:0.5 (220 ms)

  ● school_theme › fail

    expect(received).toEqual(expected) // deep equality

    Expected: 0
    Received: 0.5

Test Suites: 1 failed, 1 total
Tests:       1 failed, 2 passed, 3 total
Snapshots:   0 total
Time:        6.126 s, estimated 14 s
```

In questo esempio:

- **FAIL** indica che almeno uno dei test ha fallito.
- Il simbolo ❌ accanto a fail mostra il test che non ha superato il controllo.
- Sotto la sezione ● school_theme › fail trovi un resoconto dettagliato dell’errore, inclusa la differenza tra il valore Expected e quello Received.
- **Test Suites**: Riporta il numero di suite di test fallite (qui, 1 failed).
- **Tests**: Riporta il numero di test falliti rispetto al totale eseguito (es. 1 failed, 2 passed, 3 total).

In questo modo puoi monitorare facilmente il progresso e gli esiti dei tuoi test, identificando rapidamente le aree che necessitano di correzioni.
