import { chromium, Page } from '@playwright/test';
import { Crawlable } from './crawlable';
import { Prisma } from '@prisma/client';

export class GS extends Crawlable<Prisma.CrawlingGSCreateManyInput> {
  // 이벤트 상품
  private readonly eventGoodsURL =
    'http://gs25.gsretail.com/gscvs/ko/products/event-goods';

  // 신선식품
  private readonly freshFoodURL =
    'http://gs25.gsretail.com/gscvs/ko/products/youus-freshfood';

  // PB 상품
  private readonly pbURL =
    'http://gs25.gsretail.com/gscvs/ko/products/youus-different-service';

  constructor() {
    super();
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async run() {
    await this.init();
    const freshFood = await this.crawlFreshFood();
    const PBs = await this.crawlPB();
    const eventGoods = await this.crawlEventGoods();
    await this.browser.close();

    return [...eventGoods, ...freshFood, ...PBs];
  }

  private async getLastPageIndex(page: Page) {
    const paginations = await page.locator('.paging').all();
    const pagination = await paginations.at(-1)?.locator('.next2');
    if (!pagination) return 1;
    const onclickAttribute = await pagination.getAttribute('onclick');
    const lastPageIndex = onclickAttribute?.replace(/\D/g, '');
    return Number(lastPageIndex) || 1;
  }

  private async crawlEventGoods() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.eventGoodsURL);
    await page.waitForLoadState('domcontentloaded');

    const showAllEventGoodsButton = await page.locator('#TOTAL');
    await showAllEventGoodsButton.click();
    await page.waitForTimeout(3000);

    console.log('이벤트 상품 크롤링 시작');
    const arr = await this.crawling(page);
    console.log('이벤트 상품 크롤링 종료');
    return arr;
  }

  private async crawlFreshFood() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.freshFoodURL);
    await page.waitForLoadState('networkidle');

    console.log('신선식품 크롤링 시작');
    const arr = await this.crawling(page);
    console.log('신선식품 크롤링 종료');
    return arr;
  }

  private async crawlPB() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.pbURL);
    await page.waitForLoadState('networkidle');

    console.log('PB 상품 크롤링 시작');
    const arr = await this.crawling(page);
    console.log('PB 상품 크롤링 종료');
    return arr;
  }

  private async crawling(page: Page) {
    const lastPageIndex = await this.getLastPageIndex(page);

    let arr: Prisma.CrawlingGSCreateManyInput[] = [];
    for (let i = 0; i < lastPageIndex; i++) {
      console.log(`현재 진행중인 페이지: ${i + 1}`);
      arr = arr.concat(await this.crawlItems(page));

      const nextBtns = await page.locator('a.next').all();
      const nextBtn = nextBtns.at(-1);
      if (!nextBtn) break;
      const attribute = await nextBtn.getAttribute('onclick');
      if (!attribute) break;
      await nextBtn.click();
      await page.waitForLoadState('load');
      await page.waitForFunction(
        () => document.querySelector('.blockUI.blockMsg.blockPage') === null
      );
    }

    return arr;
  }

  private async crawlItems(page: Page) {
    const list = await page.locator('.prod_list').all();
    const items = await list.at(-1)?.locator('li').all();
    const arr: Prisma.CrawlingGSCreateManyInput[] = [];
    if (!items) return arr;

    for (const item of await items) {
      const name = await item.locator('p.tit').first().innerText();
      let priceString = await item
        .locator('p.price')
        .first()
        .locator('.cost')
        .innerText();
      priceString = priceString.replace(/[,원]/g, '');
      const price = Number(priceString);
      const img =
        (await item
          .locator('p.img')
          .first()
          .locator('img')
          .getAttribute('src')) || '';
      let barcode = '';
      if (img) barcode = /GD_(?<barcode>\d+)/.exec(img)?.groups?.barcode || '';

      const eventType = await item.locator('.flag_box p > span').innerText();
      let giftObject: Pick<
        Prisma.CrawlingGSCreateManyInput,
        'giftName' | 'giftPrice' | 'giftImg' | 'giftBarcode'
      > = {
        giftName: null,
        giftPrice: null,
        giftImg: null,
        giftBarcode: null,
      };

      if (eventType === '덤증정') {
        const gift = await item.locator('.dum_box');
        const giftAll = await gift.all();
        const hasGift = giftAll.length > 0;

        if (hasGift) {
          const giftName = await gift.locator('p.name').innerText();

          let giftPriceString = await gift.locator('p.price').innerText();
          giftPriceString = giftPriceString.replace(/[,원]/g, '');
          const giftPrice = Number(giftPriceString);

          let giftImg: string | null = '';
          try {
            giftImg = await gift.locator('p.img img').getAttribute('src', {
              timeout: 3000,
            });
          } catch (e) {
            console.error(e);
            console.log(`${name} 에러발생`);
          }

          let giftBarcode = '';
          if (giftImg)
            giftBarcode =
              /GD_(?<barcode>\d+)/.exec(giftImg)?.groups?.barcode || '';

          giftObject = {
            giftName,
            giftPrice,
            giftImg,
            giftBarcode,
          };
        }
      }

      const payload: Prisma.CrawlingGSCreateManyInput = {
        name,
        price,
        img,
        barcode,
        eventType,
        ...giftObject,
      };

      arr.push(payload);
    }

    return arr;
  }
}
