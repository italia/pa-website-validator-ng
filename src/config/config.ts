const config: any = {
    "school": {
        "homepage": {
            "gatherers": [
                "first-level-pages"
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
        }, "second-level": {
            "gatherers": [
                "second-level-pages"
            ],
            "audits": [
                "school-font-audits"
            ]
        },
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