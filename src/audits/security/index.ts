"use strict";

import * as sslCertificate from "get-ssl-certificate";
import {Page} from "puppeteer";

import {Audit} from "../Audit.js";
import {notExecutedErrorMessage} from "../../config/commonAuditsParts.js";
import cipher = crawlerTypes.cipher;
import cipherInfo = crawlerTypes.cipherInfo;
import {allowedCiphers} from "./allowedCiphers.js";
import https from "https";
import {TLSSocket} from "tls";
import crawlerTypes from "../../types/crawler-types.js";

const allowedTlsVersions = ["TLSv1.2", "TLSv1.3"];

const errorLogging = [
    "il sito non utilizza il protocollo HTTPS",
    "il certificato è scaduto",
    "la versione del TLS richiesta deve essere superiore alla 1.2",
    "la versione della suite di cifratura per TLSv1.2 richiesta è una tra: " +
    allowedCiphers.tls12.join(", "),
    "la versione della suite di cifratura per TLSv1.3 richiesta è una tra: " +
    allowedCiphers.tls13.join(", "),
];

class SecurityAudit extends Audit {

    public globalResults: any = {
        score: 0,
        details: {
            items: [],
            type: 'table',
            headings: [],
            summary: ''
        },
        errorMessage: ''
    };

    private headings : any = [];

    static get meta() {
        return {
            id: this.auditId,
            title: this.auditData.title,
            failureTitle: this.auditData.failureTitle,
            description: this.auditData.description,
            scoreDisplayMode: this.SCORING_MODES.BINARY,
            requiredArtifacts: ["origin"],
        };
    }

    async auditPage(
        page: Page | null,
        error?: string,
    ) {

        if(error && !page){

            this.globalResults.score = 0;
            this.globalResults.details.items.push([
                {
                    result: notExecutedErrorMessage.replace("<LIST>", error),
                },
            ]);
            this.globalResults.details.headings= [{ key: "result", itemType: "text", text: "Risultato" }];

            return {
                score: 0,
            }
        }

        if(page){
            const url = page.url();

            const greenResult = (this.constructor as typeof Audit).auditData.greenResult.replace("[url]", url);
            const redResult = (this.constructor as typeof Audit).auditData.redResult.replace("[url]", url);

            this.headings = [
                { key: "result", itemType: "text", text: "Risultato" },
                {
                    key: "protocol",
                    itemType: "text",
                    text: "Protocollo usato dal dominio",
                },
                {
                    key: "certificate_validation",
                    itemType: "text",
                    text: "Validità del certificato",
                },
                { key: "tls_version", itemType: "text", text: "Versione TLS" },
                { key: "cipher_suite", itemType: "text", text: "Suite di cifratura" },
                {
                    key: "redirect_to_https",
                    itemType: "text",
                    text: "La pagina effettua redirect da http a https",
                },
            ];

            const item = [
                {
                    result: redResult,
                    protocol: "",
                    certificate_validation: "",
                    tls_version: "",
                    cipher_suite: "",
                    redirect_to_https: "",
                },
            ];
            let score = 0;

            const protocol = await getProtocol(url);
            if (protocol !== "https") {
                item[0].protocol = protocol;
                item[0].result = redResult + errorLogging[0];
                return {
                    score: 0,
                    details: {  items: item,  type: 'table',  headings: this.headings,  summary: ''},
                };
            }

            let certificate = {
                valid: false,
                valid_from: "",
                valid_to: "",
            };
            let tls = {
                valid: false,
                tls_version: "",
            };
            let cipherSuite = {
                valid: false,
                version: "",
            };

            try {
                certificate = await checkCertificateValidation(url);
                tls = await checkTLSVersion(url);
                cipherSuite = await checkCipherSuite(url);
            } catch (e) {
                item[0].protocol = protocol;
                item[0].result = redResult + " Certificato non trovato";
                return {
                    score: 0,
                    details: {  items: item,  type: 'table',  headings: this.headings,  summary: ''},
                };
            }

            item[0].protocol = protocol;

            if (certificate.valid_from && certificate.valid_to) {
                const validFrom = new Date((certificate.valid_from as string).toString());
                const validTo = new Date((certificate.valid_from as string).toString());
                item[0].certificate_validation =
                    "Dal " +
                    validFrom.getDate() +
                    "/" +
                    validFrom.getMonth() +
                    "/" +
                    validFrom.getFullYear() +
                    " al " +
                    validTo.getDate() +
                    "/" +
                    validTo.getMonth() +
                    "/" +
                    validTo.getFullYear();
            }

            if (tls.tls_version === "TLSv1.2") {
                item[0].tls_version = "1.2";
            } else if (tls.tls_version === "TLSv1.3") {
                item[0].tls_version = "1.3";
            } else {
                item[0].tls_version = "";
            }

            item[0].cipher_suite = cipherSuite.version;

            if (certificate.valid && tls.valid && cipherSuite.valid) {
                score = 1;
                item[0].result = greenResult;
            } else {
                let errors: string[] = [];
                if (!certificate.valid) {
                    errors = [...errors, errorLogging[1]];
                }

                if (!tls.valid) {
                    errors = [...errors, errorLogging[2]];
                }

                if (tls.tls_version === allowedTlsVersions[0] && !cipherSuite.valid) {
                    errors = [...errors, errorLogging[3]];
                }

                if (tls.tls_version === allowedTlsVersions[1] && !cipherSuite.valid) {
                    errors = [...errors, errorLogging[4]];
                }

                item[0].result = redResult + errors.join(", ");
            }

            const protocolInPage = await page.evaluate(async function () {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                return window.location.protocol || null;
            });

            item[0].redirect_to_https = protocolInPage === "https:" ? "Sì" : "No";

            this.globalResults.score = score;
            this.globalResults.details.items = item;
            this.globalResults.details.headings = this.headings;

            return {
                score: score,
            };
        }
    }

    async getType(){
        return (this.constructor as typeof Audit).auditId;
    }

    async returnGlobal(){
        return this.globalResults;
    }

    static getInstance(): Promise<SecurityAudit> {
        if (!SecurityAudit.instance) {
            SecurityAudit.instance = new SecurityAudit('',[],[]);
        }
        return SecurityAudit.instance;
    }

}

export {SecurityAudit};
export default SecurityAudit.getInstance;

async function getProtocol(url: string): Promise<string> {
    const urlElements = url.split("://");

    if (urlElements.length <= 0) {
        return "";
    }

    return urlElements[0];
}

async function checkCertificateValidation(
    url: string
): Promise<{ valid: boolean; valid_from: string; valid_to: string }> {
    const returnObj = {
        valid: false,
        valid_from: "",
        valid_to: "",
    };

    const hostname = new URL(url).hostname;

    const certificate = await sslCertificate.get(hostname);
    if (certificate) {
        const validFromTimestamp = Date.parse(certificate.valid_from ?? null);
        const validToTimestamp = Date.parse(certificate.valid_to ?? null);

        if (!isNaN(validFromTimestamp) && !isNaN(validToTimestamp)) {
            const todayTimestamp = Date.now();
            if (
                todayTimestamp > validFromTimestamp &&
                todayTimestamp < validToTimestamp
            ) {
                returnObj.valid = true;
            }
        }

        returnObj.valid_from = certificate.valid_from;
        returnObj.valid_to = certificate.valid_to;
    }

    return returnObj;
}

async function checkTLSVersion(
    url: string
): Promise<{ valid: boolean; tls_version: string }> {
    const returnObj = {
        valid: false,
        tls_version: "",
    };

    const cipherInfo: cipher = {
        version: await getCipherVersion(url),
    };

    if (!cipherInfo || !cipherInfo.version) {
        return returnObj;
    }

    if (allowedTlsVersions.includes(cipherInfo.version)) {
        returnObj.valid = true;
    }
    returnObj.tls_version = cipherInfo.version ?? "";

    return returnObj;
}

async function checkCipherSuite(
    url: string
): Promise<{ valid: boolean; version: string }> {
    const returnObj = {
        valid: false,
        version: "",
    };

    const cipherInfo: cipherInfo = {
        version: await getCipherVersion(url),
        standardName: await getCipherStandardName(url),
    };

    if (!cipherInfo || !cipherInfo.version || !cipherInfo.standardName) {
        return returnObj;
    }

    switch (cipherInfo.version) {
        case "TLSv1.2":
            if (allowedCiphers.tls12.includes(cipherInfo.standardName)) {
                returnObj.valid = true;
            }
            break;
        case "TLSv1.3":
            if (allowedCiphers.tls13.includes(cipherInfo.standardName)) {
                returnObj.valid = true;
            }
            break;
        default:
            returnObj.valid = false;
    }

    returnObj.version = cipherInfo.standardName ?? "";

    return returnObj;
}

async function getCipherVersion(hostname: string): Promise<string> {
    return new Promise(function (resolve) {
        https
            .request(hostname, function (res) {
                resolve((res.socket as TLSSocket).getCipher().version);
            })
            .on("error", function () {
                resolve("");
            })
            .end();
    });
}

async function getCipherStandardName(hostname: string): Promise<string> {
    return new Promise(function (resolve) {
        https
            .request(hostname, function (res) {
                resolve((res.socket as TLSSocket).getCipher().standardName);
            })
            .on("error", function () {
                resolve("");
            })
            .end();
    });
}
