export interface AuditDictionary {
  greenResult: string;
  yellowResult: string;
  redResult: string;
  nonExecuted: string;
  title: string;
  failureTitle: string;
  description: string;
  subItem?: {
    greenResult?: string;
    yellowResult?: string;
    redResult?: string;
  };
}

export interface PageData {
  id: string;
  url: string;
  type: string;
  redirectUrl: string | undefined;
  internal: boolean | undefined;
  gathered: boolean;
  audited: boolean;
  errors?: Error[] | string[];
  temporaryGatherer?: boolean;
  temporaryAudit?: boolean;
  scanning?: boolean;
}

export interface RequestPages {
  type: string;
  numberOfPages: number;
}

export interface PageLink {
  linkName: string;
  linkUrl: string;
}

export interface Cipher {
  version: string;
}

export interface Links {
  text: string;
  className: string;
}

export interface CipherInfo {
  version: string;
  standardName: string;
}

export interface Servizi {
  containsAllTheMandatoryItems: boolean;
  rightOrder: boolean;
  missingItems: string[];
}

export interface SecondaryModelMenu {
  passed: boolean;
  items: Array<Element>;
  rawText: string[];
  missingItems: Array<string>;
}

export interface PrimaryModelMenu {
  passed: boolean;
  rightOrder: boolean;
  items: Array<Element>;
  rawText: string[];
  missingItems: Array<string>;
}

export interface Cookie {
  link: string;
  cookie_name: string;
  cookie_value: string;
  cookie_domain: string;
  is_correct: boolean;
}

export interface OrderResult {
  numberOfElementsNotInSequence: number;
  elementsNotInSequence: string[];
}

export interface VocabularyResult {
  allArgumentsInVocabulary: boolean;
  elementNotIncluded: string[];
  elementIncluded: string[];
}

export interface MunicipalitySecondLevelPages {
  management: PageLink[];
  news: PageLink[];
  services: PageLink[];
  live: PageLink[];
  custom: PageLink[];
}