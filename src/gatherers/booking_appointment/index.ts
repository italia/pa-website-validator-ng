import { getPrimaryPageUrl } from "../../utils/municipality/utils.js";
import { primaryMenuItems } from "../../storage/municipality/menuItems.js";
import { DataElementError } from "../../utils/DataElementError.js";
import { Gatherer } from "../Gatherer.js";
import { PageData } from "../../types/crawler-types.js";

class bookingAppointmentGatherer extends Gatherer {
  static dataElements: string[] = ["appointment-booking"];
  static pageType: string = "appointment-booking";

  static getInstance(): bookingAppointmentGatherer {
    if (!bookingAppointmentGatherer.instance) {
      bookingAppointmentGatherer.instance = new bookingAppointmentGatherer("");
    }
    return bookingAppointmentGatherer.instance;
  }

  async navigateAndFetchPages(url: string): Promise<PageData[]> {
    const currentClass = this.constructor as typeof Gatherer;

    const servicesPage = await getPrimaryPageUrl(
      url,
      primaryMenuItems.services.data_element,
    );
    if (servicesPage === "") {
      throw new DataElementError(primaryMenuItems.services.data_element);
    }

    const bookingAppointmentPage = await getPrimaryPageUrl(
      servicesPage,
      "appointment-booking",
    );
    if (bookingAppointmentPage === "") {
      throw new DataElementError("appointment-booking");
    }

    this.gatheredPages = [bookingAppointmentPage].map((url: string) => {
      return {
        url: url,
        id: currentClass.pageType + Date.now(),
        type: currentClass.pageType,
        gathered: false,
        audited: false,
        internal: true,
        redirectUrl: "",
      };
    });

    return this.gatheredPages;
  }
}

export { bookingAppointmentGatherer };
export default bookingAppointmentGatherer.getInstance;
