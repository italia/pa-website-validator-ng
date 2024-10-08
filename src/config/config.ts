let exportedConfig: any | null = null;

const config: any = {
    "local": {
        "municipality": {
            "gatherers": {
                "homepage": [
                    "services_page",
                ],
                "services-page": [
                    "services"
                ],

            },
            "audits": {
                "homepage": [
                    "municipality_accessibility",
                ],
                "services-page": [
                    "municipality_booking_appointment"
                ],
            },
            "accuracy": {
                min: 1,
                suggested: 5,
                high: 10,
                all: -1
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
            },
            "accuracy": {
                min: 1,
                suggested: 5,
                high: 10,
                all: -1
            }
        },
    },
    "online": {
        "municipality": {
            "gatherers": {
                "homepage": [
                    "services_page",
                    "vivere_page",
                    "booking_appointment",
                    "personal_area_login",
                    "second_level_pages_all"
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
                    "lighthouse",
                    "municipality_accessibility"
                ],
                "services-page": [
                    "municipality_booking_appointment"
                ],
                "service": [
                    "municipality_bootstrap",
                    "municipality_service"
                ],
                "second-level-page-all" : [
                    "municipality_domain_audit"
                ]
                /*
                "appointment-booking": [
                    "municipality_bootstrap"
                ],
                "event": [
                    "municipality_domain_audit"
                ]*/
            },
            "accuracy": {
                min: 1,
                suggested: 5,
                high: 10,
                all: -1
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
            },
            "accuracy": {
                min: 1,
                suggested: 5,
                high: 10,
                all: -1
            }
        },

    }
}

async function initializeConfig(siteType: string, scope: string): Promise<void> {
    if (!exportedConfig) {
        exportedConfig = config[scope][siteType];
    }
}

const getAudits = () => {
    let auditIds : string[]= []
    for (let pageTypeAudits of Object.values(exportedConfig['audits'])){
        auditIds = [ ...auditIds,...pageTypeAudits as string[]]
    }
    return auditIds
}

const getGatherers = () => {
    let gathererIds : string[]= []
    for (let pageTypeGatherers of Object.values(exportedConfig['gatherers'])){
        gathererIds = [ ...gathererIds,  ...pageTypeGatherers as string[]]
    }
    return gathererIds
}

export { exportedConfig as config, initializeConfig , getAudits, getGatherers }