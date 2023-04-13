import { Command } from 'commander';
import { isEmptyObject } from './util';

interface CliOptions {
  all?: boolean;
  gs?: boolean;
  cu?: boolean;
  seven?: boolean;
}

const program = new Command();

program
  .description('편의점 크롤링 스크립트')
  .option('-a, --all', '전체 이벤트 상품 크롤링')
  .option('-g, --gs', 'GS 이벤트 상품 크롤링')
  .option('-c, --cu', 'CU 이벤트 상품 크롤링')
  .option('-s, --seven', '세븐일레븐 이벤트 상품 크롤링');

program.parse(process.argv);

const options = program.opts<CliOptions>();

if (isEmptyObject(options)) {
  program.help();
  process.exit(1);
}

if (options.all) {
  console.log('all');
}

if (options.gs) {
  console.log('gs');
}

if (options.cu) {
  console.log('cu');
}

if (options.seven) {
  console.log('seven');
}
