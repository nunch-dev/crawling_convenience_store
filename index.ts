import { Command } from 'commander';
import { Database } from './src/database';
import { isEmptyObject } from './src/util';
import { Crawler } from './src/crawler';
import { GS } from './src/GS';
import { SEVEN } from './src/SEVEN';
import { CU } from './src/CU';

interface CliOptions {
  gs?: boolean;
  cu?: boolean;
  seven?: boolean;
}

const main = async () => {
  const db = Database.getClient();
  const program = new Command();
  program
    .description('편의점 크롤링 스크립트')
    .option('-g, --gs', 'GS 이벤트 상품 크롤링')
    .option('-c, --cu', 'CU 이벤트 상품 크롤링')
    .option('-s, --seven', '세븐일레븐 이벤트 상품 크롤링');

  program.parse(process.argv);

  const options = program.opts<CliOptions>();

  if (isEmptyObject(options)) {
    program.help();
    return;
  }

  if (options.gs) {
    console.log('GS 크롤링 호출');
    const data = await new Crawler(new GS()).start();
    await db.crawlingGS.createMany({ data, skipDuplicates: false });
  }

  if (options.cu) {
    console.log('CU 크롤링 호출');
    const data = await new Crawler(new CU()).start();
    await db.crawlingCU.createMany({ data, skipDuplicates: false });
  }

  if (options.seven) {
    console.log('세븐일레븐 크롤링 호출');
    const data = await new Crawler(new SEVEN()).start();
    await db.crawlingSeven.createMany({ data, skipDuplicates: false });
  }
};

main().catch(console.error);
