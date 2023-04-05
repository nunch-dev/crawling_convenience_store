import { ConvenienceType } from '../interfaces/types';
import { Browser } from '@playwright/test';

export abstract class Crawler {
  private target: ConvenienceType;
  protected browser: Browser;

  protected constructor(target: ConvenienceType) {
    this.target = target;
  }

  abstract run(): Promise<void>;
}
