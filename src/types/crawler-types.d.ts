
declare namespace crawlerTypes {
  interface PageData {
    id: string;
    url: string;
    type: string
  }

  interface requestPages {
    type: string;
    numberOfPages: number;
  }

  interface pageLink {
    linkName: string;
    linkUrl: string;
  }

}

export default crawlerTypes;
