import { Crawler } from './crawler';
import { ConvenienceType } from '../interfaces/types';

class SEVEN extends Crawler {
  constructor() {
    super(ConvenienceType.SEVEN);
  }

  async run() {
    console.log('SEVEN run');
  }
}
