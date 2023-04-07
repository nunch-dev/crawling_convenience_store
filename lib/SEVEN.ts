import { Crawlable } from './crawlable';
import { CrawlingSeven } from '@prisma/client';

export class SEVEN extends Crawlable<CrawlingSeven> {
  constructor() {
    super();
  }

  async run() {
    return [] as any;
  }
}
