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

const auditId = "municipality-booking-appointment-check";
const auditData = auditDictionary[auditId];

class BookingAppointment extends Audit {
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
  private pageHasError = false;

  static get meta() {
    return {
      id: auditId,
      title: auditData.title,
      failureTitle: auditData.failureTitle,
      description: auditData.description,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null,
    error?: string
  ) {

    if(error && !page){

      this.score = 0;

      this.pagesInError.push({
        inspected_page: '',
        wrong_order_elements: "",
        missing_elements: error,
      });

      return {
        score: 0,
      }
    }
    
    if(page){
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
    return auditId;
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
            result: auditData.greenResult,
          });
          break;
        case 0:
          results.push({
            result: auditData.redResult,
          });
          break;
      }
    }

    results.push({});

    if (this.wrongItems.length > 0) {
      results.push({
        result: auditData.subItem.redResult,
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
        result: auditData.subItem.greenResult,
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
