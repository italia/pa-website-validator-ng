let exportedConfig: any | null = null;

const config: any = {
    "municipality": {
        "gatherers": {
            "homepage": [
                //"first-level-pages",
                "services_page",
                "vivere_page",
                "booking_appointment",
                "personal_area_login"
            ],
            "first-level": [
                "second_level_pages"
            ],
            "second-level": [],
            "events-page": [
                "events"
            ],
            "vivere-page": [
                "events_page"
            ],
            "services-page":[
                "services"
            ]
        },
        "audits": {

        }
    },
    "school": {
        "gatherers": {
            "homepage": [
                "first-level-pages",
                "services-page",
                "vivere_page",
                "booking_appointment",
                "personal_area_login"
            ],
            "first-level": [
                "second_level_pages"
            ],
            "second-level": [],
            "events-page": [
                "events"
            ],
            "vivere-page": [
                "events_page"
            ],
            "services-page":[
                "services"
            ]
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
