import { GS } from './lib/GS';
import { Crawler } from './lib/crawler';
import { Database } from './lib/database';
import { CU } from './lib/CU';

const db = Database.getClient();
const gs = new Crawler(new GS());
const cu = new Crawler(new CU());

async function runCrawlers() {
  const GSData = await gs.start();
  const { count } = await db.crawlingGS.createMany({
    data: GSData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

// runCrawlers();

async function start() {
  console.time('CU');
  await cu.start();
  console.timeEnd('CU');
}

start();
