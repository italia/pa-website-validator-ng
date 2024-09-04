import { EventEmitter } from 'events';
import crawlerTypes from "./types/crawler-types";
import PageData = crawlerTypes.PageData

class PageManager {
    private static instance: PageManager;
    private pagesArray: PageData[] = [];
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
      this.pagesArray.push(page);
      this.emitter.emit('pagesAdded', page);
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
  
    getAllPages(): PageData[] {
      return [...this.pagesArray];
    }
  }
  
  export default PageManager.getInstance();
  