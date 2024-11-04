"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getPages, getPrimaryPageUrl } from "../../utils/municipality/utils.js";
import { errorHandling } from "../../config/commonAuditsParts.js";
import { DataElementError } from "../../utils/DataElementError.js";
import { Page } from "puppeteer";
import { Audit, GlobalResultsMulti } from "../Audit.js";
import * as cheerio from "cheerio";
import { CheerioAPI } from "cheerio";
import * as ejs from "ejs";
import { __dirname, __basename } from "../esmHelpers.js";

class BookingAppointment extends Audit {
  code = "C.SI.2.1";
  mainTitle = "PRENOTAZIONE APPUNTAMENTI";
  auditId = "municipality-booking-appointment-check";
  title =
    "C.SI.2.1 - PRENOTAZIONE APPUNTAMENTI - Il sito comunale deve consentire di prenotare un appuntamento presso lo sportello di competenza";
  greenResult = "Il componente è presente in tutte le pagine analizzate.";
  yellowResult = "";
  redResult = "Il componente non è presente in tutte le pagine analizzate.";
  subItem = {
    greenResult: "Pagine nelle quali è presente il componente:",
    yellowResult: "",
    redResult: "Pagine nelle quali non è presente il componente:",
  };

  public globalResults: GlobalResultsMulti = {
    score: 1,
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    wrongPages: {
      message: "",
      headings: [],
      pages: [],
    },
    tolerancePages: {
      message: "",
      headings: [],
      pages: [],
    },
    correctPages: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };
  public wrongItems: Record<string, unknown>[] = [];
  public correctItems: Record<string, unknown>[] = [];
  public toleranceItems: Record<string, unknown>[] = [];
  public score = 1;
  private titleSubHeadings: string[] = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  getFolderName(): string {
    return __basename;
  }

  async auditPage(page: Page, url: string, pageType?: string | null) {
    this.titleSubHeadings = [
      "Componente individuato",
      'Nella sezione "Accedi al servizio" della scheda servizio è presente il pulsante di prenotazione appuntamento',
    ];

    if (pageType && pageType === "services-page") {
      const itemFirst = {
        link: url,
        component_exist: "Sì",
        in_page_url: "Non si applica",
      };

      this.correctItems.push(itemFirst);
    }

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
        page,
      );

      if (bookingAppointmentPage.length === 0) {
        throw new DataElementError("appointment-booking");
      }
    } catch (ex) {
      if (!(ex instanceof DataElementError)) {
        throw ex;
      }
      this.score = 0;

      return {
        score: 0,
      };
    }

    let $: CheerioAPI = cheerio.load("<html><body></body></html>");

    try {
      const data = await page.content();
      $ = await cheerio.load(data);
    } catch (ex) {
      if (!(ex instanceof Error)) {
        throw ex;
      }
      let errorMessage = ex.message;
      errorMessage = errorMessage.substring(
        errorMessage.indexOf('"') + 1,
        errorMessage.lastIndexOf('"'),
      );
      this.wrongItems.push({
        link: url,
        component_exist: errorMessage,
      });
    }

    const item = {
      link: url,
      component_exist: "Sì",
      in_page_url: "No",
    };

    const bookingAppointmentServicePage = await getPrimaryPageUrl(
      url,
      "appointment-booking",
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
  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    if (this.globalResults.tolerancePages) {
      this.globalResults.tolerancePages.pages = [];
    }
    this.globalResults.wrongPages.pages = [];

    if (this.wrongItems.length > 0) {
      this.globalResults.wrongPages.headings = [
        this.subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
      }
    }

    if (this.correctItems.length > 0) {
      this.globalResults.correctPages.headings = [
        this.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
      }
    }

    this.globalResults.score = this.score;
    this.globalResults.errorMessage =
      this.globalResults.pagesInError.pages.length > 0
        ? errorHandling.popupMessage
        : "";

    return this.globalResults;
  }

  static getInstance(): BookingAppointment {
    if (!BookingAppointment.instance) {
      BookingAppointment.instance = new BookingAppointment();
    }
    return <BookingAppointment>BookingAppointment.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.greenResult;
    } else {
      status = "fail";
      message = this.redResult;
    }

    return await ejs.renderFile(
      __dirname + "/municipality_booking_appointment/template.ejs",
      {
        ...(await this.meta()),
        code: this.code,
        table: this.globalResults,
        status,
        statusMessage: message,
        metrics: null,
        totalPercentage: null,
      },
    );
  }
}

export { BookingAppointment };
export default BookingAppointment.getInstance;
