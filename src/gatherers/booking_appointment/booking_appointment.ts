import { Gatherer } from '../Gatherer.js';
import crawlerTypes from "../../types/crawler-types.js";
import PageData = crawlerTypes.PageData

class bookingAppointmentGatherer extends Gatherer {

  static bookingAppointmentDataElement = "appointment-booking"

  async navigateAndFetchPages(url: string, numberOfPages=5): Promise<PageData[]> {
    if (this.gatheredPages.length >0) return this.gatheredPages

    const bookingAppointmentPage = await this.getPrimaryPageUrl(
      url,
      bookingAppointmentGatherer.bookingAppointmentDataElement
    );


    if (bookingAppointmentPage === "") {
      throw new Error("appointment-booking");
    }

    const requestedPages = [bookingAppointmentPage];
    console.log(requestedPages)

    this.gatheredPages = requestedPages.map((url: any) => {
      return {
        url: url,
        id: 'booking-appointment' + Date.now(),
        type: 'booking-appointment',
        'audited':false,
        'scanned':false,
        internal: false,
        redirectUrl:''
      }
    })

    return this.gatheredPages
  }

  static getInstance(): Promise<bookingAppointmentGatherer> {
    if (!bookingAppointmentGatherer.instance) {
      bookingAppointmentGatherer.instance = new bookingAppointmentGatherer('',3000);
    }
    return bookingAppointmentGatherer.instance;
  }
}

export { bookingAppointmentGatherer };
export default bookingAppointmentGatherer.getInstance;
