"use strict";

import * as sslCertificate from "get-ssl-certificate";
import { Page } from "puppeteer";

import { Audit, GlobalResults } from "../Audit.js";
import { allowedCiphers } from "./allowedCiphers.js";
import https from "https";
import tls from "tls";
import { TLSSocket } from "tls";
import { Cipher, CipherInfo } from "../../types/crawler-types.js";
import { redirectUrlIsInternal } from "../../utils/utils.js";

const allowedTlsVersions = ["TLSv1.2", "TLSv1.3", "TLSv1/SSLv2", "TLSv1/SSLv3"];

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
  public globalResults: GlobalResults = {
    score: 0,
    pagesItems: {
      message: "",
      headings: [],
      pages: [],
    },
    pagesInError: {
      message: "",
      headings: [],
      pages: [],
    },
    errorMessage: "",
  };

  code = "";
  mainTitle = "";
  title = "";
  url = "";
  message = "";

  async meta() {
    return {
      id: this.auditId,
      title: this.title,
      code: this.code,
      mainTitle: this.mainTitle,
      auditId: this.auditId,
    };
  }

  async auditPage(page: Page, url: string) {
    if (!(await redirectUrlIsInternal(page))) {
      return;
    }

    const greenResult = this.greenResult.replace("[url]", url);
    const redResult = this.redResult.replace("[url]", url);

    const item = [
      {
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
      this.message = redResult + errorLogging[0];
      return {
        score: 0,
        details: {
          items: item,
          type: "table",
          summary: "",
        },
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
    } catch {
      item[0].protocol = protocol;
      this.message = " certificato non trovato";
      return {
        score: 0,
        details: {
          items: item,
          type: "table",
          summary: "",
        },
      };
    }

    item[0].protocol = protocol;
    if (certificate.valid_from && certificate.valid_to) {
      const validFrom = new Date((certificate.valid_from as string).toString());
      const validTo = new Date((certificate.valid_to as string).toString());
      item[0].certificate_validation =
        "Dal " +
        validFrom.getDate() +
        "/" +
        (validFrom.getMonth() + 1) +
        "/" +
        validFrom.getFullYear() +
        " al " +
        validTo.getDate() +
        "/" +
        (validTo.getMonth() + 1) +
        "/" +
        validTo.getFullYear();
    }

    if (["TLSv1/SSLv2", "TLSv1.2"].includes(tls.tls_version)) {
      item[0].tls_version = "1.2";
    } else if (["TLSv1/SSLv3", "TLSv1.3"].includes(tls.tls_version)) {
      item[0].tls_version = "1.3";
    } else {
      item[0].tls_version = "";
    }

    item[0].cipher_suite = cipherSuite.version;

    if (certificate.valid && tls.valid && cipherSuite.valid) {
      score = 1;
      this.message = greenResult;
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

      this.message = redResult + errors.join(", ");
    }

    const protocolInPage = await page.evaluate(async function () {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return window.location.protocol || null;
    });

    item[0].redirect_to_https = protocolInPage === "https:" ? "Sì" : "No";

    this.globalResults.score = score;
    this.globalResults.id = this.auditId;

    this.globalResults.pagesItems.pages = item;
    this.globalResults.pagesItems.headings = [
      "Protocollo usato dal dominio",
      "Validità del certificato",
      "Versione TLS",
      "Suite di cifratura",
      "La pagina effettua redirect da http a https",
    ];

    return {
      score: score,
    };
  }

  async getType() {
    return this.auditId;
  }

  async returnGlobal() {
    return this.globalResults;
  }

  static getInstance(): SecurityAudit {
    if (!SecurityAudit.instance) {
      SecurityAudit.instance = new SecurityAudit();
    }
    return <SecurityAudit>SecurityAudit.instance;
  }
}

export { SecurityAudit };
export default SecurityAudit.getInstance;

async function getProtocol(url: string): Promise<string> {
  const urlElements = url.split("://");

  if (urlElements.length <= 0) {
    return "";
  }

  return urlElements[0];
}

async function checkCertificateValidation(
  url: string,
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
  url: string,
): Promise<{ valid: boolean; tls_version: string }> {
  const returnObj = {
    valid: false,
    tls_version: "",
  };

  const cipherInfo: Cipher = {
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
  url: string,
): Promise<{ valid: boolean; version: string }> {
  const returnObj = {
    valid: false,
    version: "",
  };

  const cipherInfo: CipherInfo = {
    version: await getCipherVersion(url),
    standardName: await getCipherStandardName(url),
  };

  if (!cipherInfo || !cipherInfo.version || !cipherInfo.standardName) {
    return returnObj;
  }

  switch (cipherInfo.version) {
    case "TLSv1.2":
    case "TLSv1/SSLv2":
      if (allowedCiphers.tls12.includes(cipherInfo.standardName)) {
        returnObj.valid = true;
      }
      break;
    case "TLSv1.3":
    case "TLSv1/SSLv3":
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

async function getCipherVersion(
  inputUrl: string,
  timeout = 10000,
): Promise<string> {
  const parsedUrl = new URL(inputUrl);
  const host = parsedUrl.hostname;
  const port = parsedUrl.port ? parseInt(parsedUrl.port) : 443;

  const options = {
    host: host,
    port: port,
    minVersion: "TLSv1.1",
    maxVersion: "TLSv1.3",
    servername: host,
  };

  return new Promise((resolve) => {
    const socket = tls.connect(options as any, () => {
      const tlsVersion = socket.getProtocol();
      socket.destroy();
      resolve(tlsVersion as string);
    });

    socket.on("error", (error: Error) => {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ERROR reading TLS version on \x1b[32m${inputUrl}\x1b[0m: ${error.message}`,
      );
      resolve("");
    });

    socket.setTimeout(timeout, () => {
      console.log(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ERROR reading TLS version on \x1b[32m${inputUrl}\x1b[0m: connection timed out after ${timeout} ms`,
      );
      socket.destroy();
      resolve("");
    });
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
