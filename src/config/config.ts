let exportedConfig: any | null = null;

const config: any = {
    "municipality": {
        "gatherers": {
            "homepage": [
                "services_page",
                "vivere_page",
                "booking_appointment",
                "personal_area_login"
            ],
            "events-page": [
                "events"
            ],
            "vivere-page": [
                "events_page"
            ],
            "services-page": [
                "services"
            ],

        },
        "audits": {
            "homepage": [
                "services_page",
                "vivere_page",
                "booking_appointment",
                "personal_area_login"
            ],
            "services-page": [
                "service"
            ],
            "service": [
                "service"
            ]
        }
    },
    "school": {
        "gatherers": {
            "homepage": [
                 "locations_page",
                 "school_services",
                 "school_first_level_pages",
                 "school_second_level_pages"
            ],
            "first-level": [],
            "second-level": [],
            "locations-page": [
                 "locations"
            ],
            "services-page": []
        },
        "audits": {
            "homepage": [
                "school_accessibility",
                "school_bootstrap",
                "school_vocabularies",
                "school_cookie",
                "school_font",
                "school_license",
                "school_first_level_menu",
                "school_second_level_menu",
                "school_privacy",
                "school_security",
                "school_theme",
            ],
            "first-level": [
                "school_cookie",
                "school_font",
                "school_bootstrap",
            ],
            "second-level": [
                "school_cookie",
                "school_font",
                "school_bootstrap",
            ],
            "services-page": [
                "school_cookie",
                "school_font",
                "school_service",
                "school_bootstrap",
            ],
            "locations": [
                "school_cookie",
            ],
        }
    }
}

async function initializeConfig(siteType: string): Promise<void> {
    if (!exportedConfig) {
        exportedConfig = config[siteType]
    }
}

export { exportedConfig as config, initializeConfig } 
