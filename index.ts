import { GS } from './lib/GS';
import { Crawler } from './lib/crawler';
import { Database } from './lib/database';
import { CU } from './lib/CU';
import { SEVEN } from './lib/SEVEN';

const db = Database.getClient();
const gs = new Crawler(new GS());
const cu = new Crawler(new CU());
const seven = new Crawler(new SEVEN());

async function crawlingGS() {
  const GSData = await gs.start();
  const { count } = await db.crawlingGS.createMany({
    data: GSData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

async function crawlingCU() {
  const CUData = await cu.start();
  const { count } = await db.crawlingCU.createMany({
    data: CUData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

async function crawlingSeven() {
  const SEVENData = await seven.start();
  const { count } = await db.crawlingSeven.createMany({
    data: SEVENData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

// crawlingGS();
// crawlingCU();
// crawlingSeven();
