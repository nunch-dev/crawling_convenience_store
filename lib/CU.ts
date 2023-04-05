import { Crawler } from './crawler';
import { ConvenienceType } from '../interfaces/types';

class CU extends Crawler {
  constructor() {
    super(ConvenienceType.CU);
  }

  async run() {
    console.log('CU run');
  }
}
