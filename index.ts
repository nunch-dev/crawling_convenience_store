import { GS } from './lib/GS';
import { Crawler } from './lib/crawler';

const gs = new Crawler(new GS());

gs.start();
