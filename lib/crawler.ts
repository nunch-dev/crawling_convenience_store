import { Crawlable } from './crawlable';

export class Crawler<T> {
  private crawler: Crawlable<T>;
  constructor(crawler: Crawlable<T>) {
    this.crawler = crawler;
  }

  async start() {
    return await this.crawler.run();
  }
}
