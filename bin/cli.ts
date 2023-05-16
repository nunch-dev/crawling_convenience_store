#!/usr/bin/env node
import { Command } from 'commander';
import { isEmptyObject, upsert } from '../src/util';
import { Crawler } from '../src/crawler';
import { GS } from '../src/GS';
import { CU } from '../src/CU';
import { SEVEN } from '../src/SEVEN';

interface CliOptions {
  gs?: boolean;
  cu?: boolean;
  seven?: boolean;
}

const main = async () => {
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
    process.exit(1);
  }

  if (options.gs) {
    console.log('gs');
    new Crawler(new GS()).start().then(upsert);
  }

  if (options.cu) {
    console.log('cu');
    new Crawler(new CU()).start().then(upsert);
  }

  if (options.seven) {
    console.log('seven');
    new Crawler(new SEVEN()).start().then(upsert);
  }
};

main();
