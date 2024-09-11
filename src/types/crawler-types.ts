
declare namespace crawlerTypes {
  interface PageData {
    id: string;
    url: string;
    type: string;
    redirectUrl: string | undefined
    internal: boolean | undefined
    scanned: boolean
    audited: boolean
  }

  interface requestPages {
    type: string;
    numberOfPages: number;
  }

  interface pageLink {
    linkName: string;
    linkUrl: string;
  }

  interface cipher {
    version: string;
  }

  interface links {
    text: string;
    className: string;
  }

  interface cipherInfo {
    version: string;
    standardName: string;
  }

  interface servizi {
    containsAllTheMandatoryItems: boolean;
    rightOrder: boolean;
    missingItems: string[];
  }

  interface secondaryModelMenu {
    passed: boolean;
    items: Array<Element>;
    rawText: string[];
    missingItems: Array<string>;
  }

  interface primaryModelMenu {
    passed: boolean;
    rightOrder: boolean;
    items: Array<Element>;
    rawText: string[];
    missingItems: Array<string>;
  }

  interface cookie {
    inspected_page: string;
    cookie_name: string;
    cookie_value: string;
    cookie_domain: string;
    is_correct: boolean;
  }

  interface orderResult {
    numberOfElementsNotInSequence: number;
    elementsNotInSequence: string[];
  }

  interface vocabularyResult {
    allArgumentsInVocabulary: boolean;
    elementNotIncluded: string[];
    elementIncluded: string[];
  }

  interface requestPages {
    type: string;
    numberOfPages: number;
  }

  interface pageLink {
    linkName: string;
    linkUrl: string;
  }

  interface municipalitySecondLevelPages {
    management: pageLink[];
    news: pageLink[];
    services: pageLink[];
    live: pageLink[];
    custom: pageLink[];
  }
}

export default crawlerTypes;
