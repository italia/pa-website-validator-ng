const config: any = {
    "school": {
        "homepage": {
            "gatherers": [
                "first-level-pages",
                "services-page"
            ],
            "audits": [
                "lighthouse",
                "school-font-audits"
            ]
        },
        "first-level": {
            "gatherers": [
                "second-level-pages"
            ],
            "audits": [
                "school-font-audits"
            ]
        }, 
        "second-level": {
            "gatherers": [
                "second-level-pages"
            ],
            "audits": [
                "school-font-audits"
            ]
        },
        "service":{
            "gatherers": [
                "booking-appointment"
            ],
            "audits":[

            ]
        },
        "services-page":{
            "gatherers": [
                "booking-appointment"
            ],
            "audits":[

            ]
        }
    },
    "municipality": {
        "homepage": {
            "gatherers": [],
            "audits": []
        },
        "first-level": {
            "gatherers": [],
            "audits": []
        }
    }
}

export default config