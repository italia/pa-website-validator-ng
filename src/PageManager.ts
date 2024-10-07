import { EventEmitter } from 'events';
import crawlerTypes from "./types/crawler-types";
import PageData = crawlerTypes.PageData

class PageManager {
    private static instance: PageManager;
    private pagesArray: PageData[] = [];
    private globalResult : any = {
        audits: {}
    };
    private emitter: EventEmitter;

    private constructor() {
      this.emitter = new EventEmitter();
      this.emitter.setMaxListeners(Infinity);
    }
  
    public static getInstance(): PageManager {
      if (!PageManager.instance) {
        PageManager.instance = new PageManager();
      }
      return PageManager.instance;
    }
  
    async addPage(page:PageData): Promise<void> {
      if (!this.pagesArray.find(pageEl=>(pageEl.url == page.url && page.type == pageEl.type))) {
        this.pagesArray.push({...page});
        this.emitter.emit('pagesAdded', page);
      }
    }

    async setGlobalResults(result: any) {
        let audits = this.globalResult.audits;
        let newKey = Object.keys(result)[0];
        let foundKey = Object.keys(audits).find(el => el == newKey);
        if(foundKey){
            audits[foundKey] = Object.values(result)[0];
        }else{
            audits[newKey] = Object.values(result)[0];
        }
        this.globalResult.audits = audits;
    }

    async getGlobalResults() {
        return this.globalResult;
    }
  
    removePage(id:string) {
      this.pagesArray.filter(el => el.id!=id)
    }
    
    onPagesAdded(callback: (pageData: PageData) => void): void {
      this.emitter.on('pagesAdded', callback);
    }
  
    getPageById(id: string): PageData | undefined {
      return this.pagesArray.find(page => page.id === id);
    }

    getPageByUrl(url: string): PageData | any {
        if(this.pagesArray && this.pagesArray.length){
            return this.pagesArray.find(page => page.url === url);
        }
        return
    }
  
    getAllPages(): PageData[] {
      return [...this.pagesArray];
    }

    setAudited(url:string){
      let page = this.pagesArray.find(page => page.url === url)
      if (page) page.audited = true
    }

    setGathered(url:string){
        let page = this.pagesArray.find(page => page.url === url)
        if (page) page.gathered = true
    }

    setNotTemporary(url:string, pageType: string){
        let page = this.pagesArray.find(page => (page.url === url || page.type === pageType))
        if (page) page.temporary = false
    }

    setErrors(url:string, errors:Error[], returnPage?: boolean) : PageData | any{
      let page = this.pagesArray.find(page => page.url === url)
      if (page) page.errors = errors;

      if(returnPage){
          return page;
      }
    }

    hasRemainingPages(){
      const remainingPages = this.pagesArray.find(el=> !el.audited || !el.gathered || el.temporary)
      return remainingPages != undefined
    }
  }
  
  export default PageManager.getInstance();
  