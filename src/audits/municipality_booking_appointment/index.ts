"use strict";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {getPages, getPrimaryPageUrl} from "../../utils/municipality/utils.js";
import {auditDictionary} from "../../storage/auditDictionary.js";
import {errorHandling, notExecutedErrorMessage,} from "../../config/commonAuditsParts.js";
import {DataElementError} from "../../utils/DataElementError.js";
import {Page} from "puppeteer";
import {Audit} from "../Audit.js";
import * as cheerio from "cheerio";
import {CheerioAPI} from "cheerio";
import * as ejs from "ejs";
import {fileURLToPath} from "url";
import path from "path";

class BookingAppointment extends Audit {
  code = "C.SI.2.1";
  mainTitle = "PRENOTAZIONE APPUNTAMENTI";
  auditId = "municipality-booking-appointment-check";
  auditData = auditDictionary["municipality-booking-appointment-check"];

  public globalResults: any = {
    score: 1,
    details: {
      items: [],
      type: "table",
      headings: [],
      summary: "",
    },
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
  public wrongItems: any = [];
  public toleranceItems: any = [];
  public correctItems: any = [];
  public pagesInError: any = [];
  public score = 1;
  private titleSubHeadings: any = [];
  private headings: any = [];

  async meta() {
    return {
      code: this.code,
      id: this.auditId,
      title: this.auditData.title,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
      failureTitle: this.auditData.failureTitle,
      description: this.auditData.description,
      scoreDisplayMode: this.SCORING_MODES.NUMERIC,
      requiredArtifacts: ["origin"],
    };
  }

  async auditPage(
    page: Page | null,
    url: string,
    error?: string,
    pageType?: string | null,
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
        subItemsHeading: { key: "link", itemType: "url" },
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

    if (error && !page) {
      this.score = 0;

      this.pagesInError.push({
        link: url,
        component_exist: error,
      });

      return {
        score: 0,
      };
    }

    if (page) {
      const url = page.url();

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
        this.globalResults.details.items = [
          { key: "result", itemType: "text", text: "Risultato" },
        ];
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
        this.pagesInError.push({
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
  }
  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    this.globalResults.correctPages.pages = [];
    this.globalResults.tolerancePages.pages = [];
    this.globalResults.wrongPages.pages = [];
    this.globalResults.pagesInError.pages = [];

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

      this.globalResults.pagesInError.message = errorHandling.errorMessage;
      this.globalResults.pagesInError.headings = [
        errorHandling.errorColumnTitles[0],
        errorHandling.errorColumnTitles[1],
      ];

      for (const item of this.pagesInError) {
        this.globalResults.pagesInError.pages.push(item);
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

      this.globalResults.wrongPages.headings = [
        this.auditData.subItem.redResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.wrongItems) {
        this.globalResults.wrongPages.pages.push(item);
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

      this.globalResults.correctPages.headings = [
        this.auditData.subItem.greenResult,
        this.titleSubHeadings[0],
        this.titleSubHeadings[1],
      ];

      for (const item of this.correctItems) {
        this.globalResults.correctPages.pages.push(item);
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
    this.globalResults.errorMessage =
      this.pagesInError.length > 0 ? errorHandling.popupMessage : "";

    return this.globalResults;
  }

  static getInstance(): Promise<BookingAppointment> {
    if (!BookingAppointment.instance) {
      BookingAppointment.instance = new BookingAppointment("", [], []);
    }
    return BookingAppointment.instance;
  }

  async returnGlobalHTML() {
    let status = "fail";
    let message = "";

    if (this.score > 0.5) {
      status = "pass";
      message = this.auditData.greenResult;
    } else {
      status = "fail";
      message = this.auditData.redResult;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    return await ejs.renderFile(
        __dirname + "/template.ejs",
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
