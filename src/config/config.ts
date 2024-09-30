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
            "services-page": []
        },
        "audits": {
            "homepage": [
                "school_accessibility",
                "school_bootstrap"
            ]
        }
    }
}

async function initializeConfig(siteType: string): Promise<void> {
    if (!exportedConfig) {
        exportedConfig = config[siteType]
    }
}

export { exportedConfig as config, initializeConfig } 
