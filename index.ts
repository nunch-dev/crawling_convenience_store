import { GS } from './lib/GS';
import { Crawler } from './lib/crawler';
import { Database } from './lib/database';

const db = Database.getClient();
const gs = new Crawler(new GS());

async function runCrawlers() {
  const GSData = await gs.start();
  const { count } = await db.crawlingGS.createMany({
    data: GSData,
    skipDuplicates: true,
  });

  console.log(`Create Many Result: `, count);

  await db.$disconnect();
}

runCrawlers();
