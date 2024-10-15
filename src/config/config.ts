let exportedConfig: any | null = null;

const config: any = {
  local: {
    municipality: {
      gatherers: {
        homepage: ["services_page"],
        "services-page": ["services"],
      },
      audits: {
        homepage: [
          "lighthouse",
          "municipality_accessibility",
          "municipality_domain_audit",
          "municipality_faq",
          "municipality_vocabulary",
          "municipality_improvement_plan",
          "municipality_inefficiency_report_audit",
          "municipality_license",
          "municipality_privacy",
          "municipality_security",
          "municipality_theme",
          "municipality_informative_accessibility",
          "municipality_informative_cloud_infrastructure",
          "municipality_informative_cookie",
          "municipality_informative_domain",
          "municipality_informative_reuse",
          "municipality_informative_security",
          "ipLocation",
        ],
        "services-page": ["municipality_booking_appointment"],
        service: [
          "municipality_domain_audit",
          "municipality_bootstrap",
          "municipality_booking_appointment",
          "municipality_contacts_assistency_audit",
          //   "municipality_cookie",
          "municipality_font",
          "municipality_metatag",
          "municipality_service",
          "municipality_user_experience_evaluation",
        ],
        "first-level-page": [
          "municipality_bootstrap",
          //    "municipality_cookie",
          "municipality_domain_audit",
          "municipality_feedback",
          "municipality_font",
          "municipality_menu",
        ],
        "second-level-page-all": [
          "municipality_bootstrap",
          //  "municipality_cookie",
          "municipality_domain_audit",
          "municipality_feedback",
          "municipality_font",
          "municipality_second_level_pages_audit",
        ],
        "personal-area-login": [
          "municipality_bootstrap",
          //  "municipality_cookie",
          "municipality_domain_audit",
          "municipality_font",
        ],
        "appointment-booking": [
          "municipality_domain_audit",
          "municipality_bootstrap",
          // "municipality_cookie"
        ],
        event: [
          "municipality_domain_audit",
          //    "municipality_cookie"
        ],
      },
      accuracy: {
        min: 1,
        suggested: 5,
        high: 10,
        all: -1,
      },
    },
    school: {
      gatherers: {
        homepage: [
          // "locations_page",
          // "school_services",
          // "school_first_level_pages",
          // "school_second_level_pages"
        ],
        "first-level": [],
        "second-level": [],
        "locations-page": [
          // "locations"
        ],
        "services-page": [],
      },
      audits: {
        homepage: ["school_accessibility", "school_bootstrap"],
      },
      accuracy: {
        min: 1,
        suggested: 5,
        high: 10,
        all: -1,
      },
    },
  },
  online: {
    municipality: {
      gatherers: {
        homepage: [
          "services_page",
          "vivere_page",
          "booking_appointment",
          "personal_area_login",
          "first_level_pages",
          "second_level_pages_all",
        ],
        "events-page": ["events"],
        "vivere-page": ["events_page"],
        "services-page": ["services"],
      },
      audits: {
        homepage: [
          "lighthouse",
          "municipality_accessibility",
          "municipality_domain_audit",
          "municipality_faq",
          "municipality_vocabulary",
          //"municipality_improvement_plan",
          //"municipality_inefficiency_report_audit",
          //"municipality_license",
          //"municipality_privacy",
          // "municipality_security",
          //"municipality_theme",
          //"municipality_informative_accessibility",
          //"municipality_informative_cloud_infrastructure",
          //"municipality_informative_cookie",
          //"municipality_informative_domain",
          // "municipality_informative_reuse",
          //"municipality_informative_security",
          "ipLocation",
        ],
        "services-page": ["municipality_booking_appointment"],
        service: [
          "municipality_domain_audit",
          "municipality_bootstrap",
          //"municipality_booking_appointment",
          "municipality_contacts_assistency_audit",
          "municipality_cookie",
          "municipality_font",
          //"municipality_metatag",
          "municipality_service",
          "municipality_user_experience_evaluation",
        ],
        "personal-area-login": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_font",
        ],
        "first-level-page": [
          "municipality_bootstrap",
          // "municipality_cookie",
          "municipality_domain_audit",
          //"municipality_feedback",
          "municipality_font",
        ],
        "second-level-page-all": [
          "municipality_bootstrap",
          //  "municipality_cookie",
          "municipality_domain_audit",
          //"municipality_feedback",
          //"municipality_font",
        ],

        "appointment-booking": [
          "municipality_domain_audit",
          "municipality_bootstrap",
          // "municipality_cookie"
        ],
        event: [
          "municipality_domain_audit",
          //    "municipality_cookie"
        ],
      },
      accuracy: {
        min: 1,
        suggested: 5,
        high: 10,
        all: -1,
      },
    },
    school: {
      gatherers: {
        homepage: [
          // "locations_page",
          // "school_services",
          // "school_first_level_pages",
          // "school_second_level_pages"
        ],
        "first-level": [],
        "second-level": [],
        "locations-page": [
          // "locations"
        ],
        "services-page": [],
      },
      audits: {
        homepage: ["school_accessibility", "school_bootstrap"],
      },
      accuracy: {
        min: 1,
        suggested: 5,
        high: 10,
        all: -1,
      },
    },
  },
};

async function initializeConfig(
  siteType: string,
  scope: string,
): Promise<void> {
  if (!exportedConfig) {
    exportedConfig = config[scope][siteType];
  }
}

const getAudits = () => {
  let auditIds: string[] = [];
  for (const pageTypeAudits of Object.values(exportedConfig["audits"])) {
    auditIds = [...auditIds, ...(pageTypeAudits as string[])];
  }
  return auditIds;
};

const getGatherers = () => {
  let gathererIds: string[] = [];
  for (const pageTypeGatherers of Object.values(exportedConfig["gatherers"])) {
    gathererIds = [...gathererIds, ...(pageTypeGatherers as string[])];
  }
  return gathererIds;
};

export { exportedConfig as config, initializeConfig, getAudits, getGatherers };
