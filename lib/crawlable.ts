import { Browser } from '@playwright/test';
import { ConvenienceType } from '../interfaces/types';

export abstract class Crawlable {
  browser: Browser;
  target: ConvenienceType;

  abstract run(): Promise<void>;
}
