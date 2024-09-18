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
            "first-level": [
            ],
            "second-level": [],
            "events-page": [
                "events"
            ],
            "vivere-page": [
                "events_page"
            ],
            "services-page": [
                "services"
            ]
        },
        "audits": {

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

        }
    }
}

async function initializeConfig(siteType: string): Promise<void> {
    if (!exportedConfig) {
        exportedConfig = config[siteType]
    }
}

export { exportedConfig as config, initializeConfig } 
