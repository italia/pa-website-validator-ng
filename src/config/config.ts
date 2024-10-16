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
          "municipality_informative_cloud_infrastructure",
          "municipality_informative_reuse",
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
          "municipality_improvement_plan",
          "municipality_inefficiency_report_audit",
          "municipality_license",
          "municipality_privacy",
          "municipality_security",
          "municipality_theme",
          "municipality_informative_cloud_infrastructure",
          "municipality_informative_reuse",
          "ipLocation",
        ],
        "services-page": ["municipality_booking_appointment"],
        service: [
          "municipality_domain_audit",
          "municipality_bootstrap",
          "municipality_booking_appointment",
          "municipality_contacts_assistency_audit",
          "municipality_cookie",
          "municipality_font",
          "municipality_metatag",
          "municipality_service",
          "municipality_user_experience_evaluation",
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
      "gatherers": {
        "homepage": [
          "locations_page",
          "school_services",
          "school_first_level_pages",
          "school_second_level_pages"
        ],

        "locations-page": [
          "locations"
        ],

      },
      "audits": {
        "homepage": [
          "lighthouse",
          "school_accessibility",
          "school_bootstrap",
          "school_license",
          "school_privacy",
          "school_security",
          "school_theme",
          "school_first_level_menu",
          "school_second_level_menu",
          "school_vocabularies",
          "school_informative_cloud_infrastructure",
          "school_informative_reuse",
        ],
        "first-level": [
          "school_bootstrap",
          "school_cookie",
          "school_font",
        ],
        "second-level": [
          "school_bootstrap",
          "school_cookie",
          "school_font",
        ],
        "service": [
          "school_bootstrap",
          "school_font",
          "school_cookie",
          "school_service"
        ],
        "location": [
          "school_cookie"
        ],
        accuracy: {
          min: 1,
          suggested: 5,
          high: 10,
          all: -1,
        },
      },
    },
  }
}

async function initializeConfig(
  siteType?: string,
  scope?: string,
) {
  if (!exportedConfig && siteType && scope) {
    exportedConfig = config[scope][siteType];
  }

  return exportedConfig;
}

const getAudits = async () => {
  const exportedConfig = await initializeConfig()
  let auditIds: string[] = [];
  for (const pageTypeAudits of Object.values(exportedConfig["audits"])) {
    auditIds = [...auditIds, ...(pageTypeAudits as string[])];
  }
  return auditIds;
};

const getGatherers = async () => {
  const exportedConfig = await initializeConfig()
  let gathererIds: string[] = [];
  for (const pageTypeGatherers of Object.values(exportedConfig["gatherers"])) {
    gathererIds = [...gathererIds, ...(pageTypeGatherers as string[])];
  }
  return gathererIds;
};

export { initializeConfig, getAudits, getGatherers };
