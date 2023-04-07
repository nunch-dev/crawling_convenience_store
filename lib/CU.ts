import { Crawlable } from './crawlable';
import { CrawlingCU } from '@prisma/client';

export class CU extends Crawlable<CrawlingCU> {
  constructor() {
    super();
  }

  async run() {
    return [] as any;
  }
}
