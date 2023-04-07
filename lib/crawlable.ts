import { Browser } from '@playwright/test';

export abstract class Crawlable<T> {
  browser: Browser;

  abstract run(): Promise<T[]>;
}
