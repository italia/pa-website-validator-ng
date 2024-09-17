import {pageGatherer} from '../page/page.js'

class bookingAppointmentGatherer extends pageGatherer {

  static dataElements:string[] = ['appointment-booking']
  static pageType:string = 'appointment-booking'

  static getInstance(): Promise<bookingAppointmentGatherer> {
    if (!bookingAppointmentGatherer.instance) {
      bookingAppointmentGatherer.instance = new bookingAppointmentGatherer('',3000);
    }
    return bookingAppointmentGatherer.instance;
  }
}

export { bookingAppointmentGatherer };
export default bookingAppointmentGatherer.getInstance;
