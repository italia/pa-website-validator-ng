"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getPrimaryPageUrl, getPages } from "../../utils/municipality/utils.js";
import { auditDictionary } from "../../storage/auditDictionary.js";
import {
  errorHandling,
  notExecutedErrorMessage,
} from "../../config/commonAuditsParts.js";
import { DataElementError } from "../../utils/DataElementError.js";
import {Page} from "puppeteer";
import {Audit} from "../Audit.js";
import {CheerioAPI} from "cheerio";
import * as cheerio from "cheerio";

class BookingAppointment extends Audit {

  code = 'C.SI.2.1'
  mainTitle = 'PRENOTAZIONE APPUNTAMENTI'
  mainDescription = 'Il sito comunale deve consentire di prenotare un appuntamento presso lo sportello di competenza.'
  minRequirement = "la funzionalità di prenotazione di un appuntamento è accessibile dalla sezione di funzionalità trasversali delle schede servizio e della pagina di primo livello 'Servizi';"
  automaticChecks = 'ricercando specifici attributi "data-element" come spiegato nella Documentazione delle App di valutazione, viene verificata la presenza del componente "Prenota appuntamento" all\'interno della sezione di funzionalità trasversali delle schede servizio analizzate e della pagina di primo livello "Servizi". Viene inoltre indicato se è stato rilevato il pulsante di accesso alla funzionalità di prenotazione appuntamento all\'interno della sezione "Accedi al servizio" delle schede servizio; RIFERIMENTI TECNICI E NORMATIVI:  [Documentazione del Modello Comuni](https://docs.italia.it/italia/designers-italia/design-comuni-docs/it/versione-corrente/index.html), [Documentazione delle App di valutazione](https://docs.italia.it/italia/designers-italia/app-valutazione-modelli-docs/it/versione-attuale/index.html)' 
  auditId = "municipality-booking-appointment-check";
  auditData = auditDictionary["municipality-booking-appointment-check"];
  failures = ''

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: 'table',
      headings: [],
      summary: ''
    },
    errorMessage: ''
  };
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError : any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings : any = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      mainDescription: this.mainDescription,
      minRequirement:this.minRequirement,
      automaticChecks: this.automaticChecks,
      failures: this.failures,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null,
    error?: string
  ) {
    this.titleSubHeadings = [
      "Componente individuato",
      'Nella sezione "Accedi al servizio" della scheda servizio è presente il pulsante di prenotazione appuntamento',
    ];
    this.headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato",
        subItemsHeading: { key: "inspected_page", itemType: "url" },
      },
      {
        key: "title_component_exist",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "component_exist",
          itemType: "text",
        },
      },
      {
        key: "title_in_page_url",
        itemType: "text",
        text: "",
        subItemsHeading: {
          key: "in_page_url",
          itemType: "text",
        },
      },
    ];

    if(error && !page){

      this.score = 0;

      this.pagesInError.push({
        inspected_page: '',
        component_exist: error,
      });

      return {
        score: 0,
      }
    }
    
    if(page){

      let url = page.url()

      const itemFirst = {
        inspected_page: url,
        component_exist: "Sì",
        in_page_url: "Non si applica",
      };

      this.correctItems.push(itemFirst);

      try {
        const bookingAppointmentPage = await getPages(
            url,
            [
              {
                type: "booking_appointment",
                numberOfPages: 1,
              },
            ],
            false,
            page
        );

        if (bookingAppointmentPage.length === 0) {
          throw new DataElementError("appointment-booking");
        }
      } catch (ex) {
        if (!(ex instanceof DataElementError)) {
          throw ex;
        }
        this.globalResults.details.items = [{ key: "result", itemType: "text", text: "Risultato" }];
        this.globalResults.details.headings = [
          {
            result: notExecutedErrorMessage.replace("<LIST>", ex.message),
          },
        ];
        this.score = 0;


        return {
          score: 0,
        };
      }

      let $: CheerioAPI | any = null;

        try {
          let data = await page.content();
          $ = await cheerio.load(data);

        } catch (ex) {
          if (!(ex instanceof Error)) {
            throw ex;
          }
          let errorMessage = ex.message;
          errorMessage = errorMessage.substring(
              errorMessage.indexOf('"') + 1,
              errorMessage.lastIndexOf('"')
          );
          this.pagesInError.push({
            inspected_page: url,
            component_exist: errorMessage,
          });
        }

        const item = {
          inspected_page: url,
          component_exist: "Sì",
          in_page_url: "No",
        };

        const bookingAppointmentServicePage = await getPrimaryPageUrl(
            url,
            "appointment-booking"
        );

        if (bookingAppointmentServicePage === "") {
          item.component_exist = "No";
        }

        const inPageButton = $('[data-element="service-booking-access"]');
        if (inPageButton.length > 0) {
          item.in_page_url = "Sì";
        }

        if (bookingAppointmentServicePage === "") {
          this.score = 0;
          this.wrongItems.push(item);
        }

        this.correctItems.push(item);
    }

  }
  async getType(){
    return this.auditId;
  }

  async returnGlobal(){

    const results = [];
    if (this.pagesInError.length > 0) {
      results.push({
        result: errorHandling.errorMessage,
      });

      results.push({});

      results.push({
        result: errorHandling.errorColumnTitles[0],
        title_component_exist: errorHandling.errorColumnTitles[1],
        title_in_page_url: "",
      });

      for (const item of this.pagesInError) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }
    } else {
      switch (this.score) {
        case 1:
          results.push({
            result: this.auditData.greenResult,
          });
          break;
        case 0:
          results.push({
            result: this.auditData.redResult,
          });
          break;
      }
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: this.auditData.subItem.redResult,
        title_component_exist: this.titleSubHeadings[0],
        title_in_page_url: this.titleSubHeadings[1],
      });

      for (const item of this.wrongItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    if (this.correctItems.length > 0) {
      results.push({
        result: this.auditData.subItem.greenResult,
        title_component_exist: this.titleSubHeadings[0],
        title_in_page_url: this.titleSubHeadings[1],
      });

      for (const item of this.correctItems) {
        results.push({
          subItems: {
            type: "subitems",
            items: [item],
          },
        });
      }

      results.push({});
    }

    this.globalResults.score = this.score;
    this.globalResults.details.items = results;
    this.globalResults.details.headings = this.headings;
    this.globalResults.errorMessage = this.pagesInError.length > 0 ? errorHandling.popupMessage : "";

    return this.globalResults;
  }

  static getInstance(): Promise<BookingAppointment> {
    if (!BookingAppointment.instance) {
      BookingAppointment.instance = new BookingAppointment('',[],[]);
    }
    return BookingAppointment.instance;
  }

}

export {BookingAppointment};
export default BookingAppointment.getInstance;
