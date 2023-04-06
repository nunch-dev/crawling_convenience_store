import { Crawlable } from './crawlable';

export class Crawler {
  private crawler: Crawlable;
  constructor(crawler: Crawlable) {
    this.crawler = crawler;
  }

  start() {
    this.crawler.run();
  }
}
