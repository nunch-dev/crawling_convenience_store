import { GS } from './lib/GS';
import { Crawler } from './lib/crawler';
import { Database } from './lib/database';
import { CU } from './lib/CU';

const db = Database.getClient();
const gs = new Crawler(new GS());
const cu = new Crawler(new CU());

async function crawlingGS() {
  const GSData = await gs.start();
  const { count } = await db.crawlingGS.createMany({
    data: GSData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

// runCrawlers();

async function crawlingCU() {
  const CUData = await cu.start();
  const { count } = await db.crawlingCU.createMany({
    data: CUData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

crawlingCU();
