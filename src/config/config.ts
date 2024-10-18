interface ConfigInterface  {
      gatherers: Record<string, string[]>,
      audits: Record<string, string[]>,
      accuracy: Record<string, number>
}

let exportedConfig: ConfigInterface;

const config = {
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
          "municipality_cookie",
          "municipality_font",
          "municipality_metatag",
          "municipality_service",
          "municipality_user_experience_evaluation",
        ],
        "first-level-page": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_feedback",
          "municipality_font",
          "municipality_menu",
        ],
        "second-level-page-all": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_feedback",
          "municipality_font",
          "municipality_second_level_pages_audit",
        ],
        "personal-area-login": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_font",
        ],
        "appointment-booking": [
          "municipality_domain_audit",
          "municipality_bootstrap",
          "municipality_cookie"
        ],
        event: [
          "municipality_domain_audit",
          "municipality_cookie"
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
          "second_level_pages",
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
          "municipality_menu",
          "ipLocation",
          "municipality_second_level_pages_audit"
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
        "personal-area-login": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_font",
        ],
        "first-level-page": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_feedback",
          "municipality_font",
        ],
        "second-level-page": [
          "municipality_bootstrap",
          "municipality_cookie",
          "municipality_domain_audit",
          "municipality_feedback",
          "municipality_font",
        ],
        "appointment-booking": [
          "municipality_domain_audit",
          "municipality_bootstrap",
          "municipality_cookie",
        ],
        event: ["municipality_domain_audit", "municipality_cookie"],
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
          "locations_page",
          "school_services",
          "school_first_level_pages",
          "school_second_level_pages",
        ],

        "locations-page": ["locations"],
      },
      audits: {
        homepage: [
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
        "first-level": ["school_bootstrap", "school_cookie", "school_font"],
        "second-level": ["school_bootstrap", "school_cookie", "school_font"],
        service: [
          "school_bootstrap",
          "school_font",
          "school_cookie",
          "school_service",
        ],
        location: ["school_cookie"],
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

async function initializeConfig(siteType?: string, scope?: string) {
  if (!exportedConfig && siteType && scope) {
    if (!exportedConfig && siteType && (siteType === 'school' || siteType === 'municipality') && (scope === 'local' || scope === 'online') && scope) {
      exportedConfig = config[scope as keyof typeof config][siteType as keyof typeof config.online];
    }
  }

  return exportedConfig;
}

const getAudits = async () => {
  const exportedConfig : ConfigInterface = await initializeConfig();
  let auditIds: string[] = [];
  for (const pageTypeAudits of Object.values(exportedConfig.audits)) {
    auditIds = [...auditIds, ...(pageTypeAudits as string[])];
  }
  return auditIds;
};

const getGatherers = async () => {
  const exportedConfig = await initializeConfig();
  let gathererIds: string[] = [];
  for (const pageTypeGatherers of Object.values(exportedConfig.gatherers)) {
    gathererIds = [...gathererIds, ...(pageTypeGatherers as string[])];
  }
  return gathererIds;
};

export { initializeConfig, getAudits, getGatherers };
