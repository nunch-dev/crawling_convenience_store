import { Crawlable } from './crawlable';
import { Prisma } from '@prisma/client';
import { chromium, Locator, Page } from '@playwright/test';
import { BadgeType } from '.prisma/client';

// 이벤트 상품만 크롤링 하는 경우 new / best 등의 상품 태그를 가져올 수 없어
// 상품 전체 페이지를 호출하고, 이벤트 상품만 필터링하는 방식으로 크롤링

export class CU extends Crawlable<Prisma.CrawlingCUCreateManyInput> {
  // Product 리스트 URL
  private readonly baseURL =
    'https://cu.bgfretail.com/product/product.do?category=product&depth2=4&depth3=';

  // 1: 간편식사, 2: 즉석조리, 3: 과자류, 4: 아이스크림, 5: 식품, 6: 음료, 7: 생활용품
  private readonly types = [
    '간편식사',
    '즉석조리',
    '과자류',
    '아이스크림',
    '식품',
    '음료',
    '생활용품',
  ];

  // 상세 화면 URL
  private readonly detailURL =
    'https://cu.bgfretail.com/product/view.do?category=product&gdIdx=';

  constructor() {
    super();
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async run() {
    await this.init();
    const result: Prisma.CrawlingCUCreateManyInput[] = [];

    for (let i = 1; i <= this.types.length; i++) {
      console.log(`CU ${this.types[i - 1]} 크롤링 시작`);
      const data = await this.crawling(i);
      console.log(`CU ${this.types[i - 1]} 크롤링 종료`);
      result.push(...data);
    }

    await this.browser.close();

    return result;
  }

  private async crawling(pageType: number) {
    const context = await this.browser.newContext();
    context.setDefaultTimeout(3000);
    const page = await context.newPage();

    await page.goto(this.baseURL + pageType);
    await page.waitForFunction(
      () => !document.querySelector('.AjaxLoading')?.checkVisibility()
    );
    await page.click('#setC');
    await page.waitForFunction(
      () => !document.querySelector('.AjaxLoading')?.checkVisibility()
    );

    await this.callAllPages(page);
    const data = await this.crawlItems(page);
    return data;
  }

  private async callAllPages(page: Page) {
    console.log('전체 페이지 호출 중 ...');
    while (true) {
      try {
        const nextButton = await page
          .locator('.prodListBtn')
          .locator('.prodListBtn-w')
          .locator('a');
        await nextButton.click();
      } catch (e) {
        break;
      }
    }
    console.log('전체 페이지 호출 완료');
  }

  private async crawlItems(page: Page) {
    const items = await page.locator('.prod_list').all();
    const arr: Prisma.CrawlingCUCreateManyInput[] = [];
    if (!items) return arr;
    console.log('전체 상품 갯수', items.length);

    for (const item of items) {
      // 1+1 or 2+1
      const eventType = await item
        .locator('.badge')
        .innerText({ timeout: 100 });
      let badge: BadgeType;
      try {
        badge =
          ((await item
            .locator('.tag')
            .locator('span')
            .getAttribute('class', { timeout: 100 })) as
            | BadgeType
            | undefined) || BadgeType.NONE;
      } catch (e) {
        badge = BadgeType.NONE;
      }

      // 이벤트나 뱃지가 없는 항목은 스킵
      if (!eventType && (!badge || badge === BadgeType.NONE)) continue;

      const name = await item
        .locator('.prod_text')
        .locator('.name')
        .innerText();
      let priceString = await item
        .locator('.prod_text')
        .locator('.price')
        .innerText();
      priceString = priceString.replace(/[,원]/g, '');
      const price = Number(priceString);
      const $img = await item.locator('div.prod_img').locator('img');
      const img = (await $img.getAttribute('src')) || '';
      const imgAlt = await $img.getAttribute('alt', { timeout: 3000 });
      let barcode = '';
      if (imgAlt) barcode = imgAlt.split('.')[0];

      const details = await this.crawlItemDetails(item);

      const obj: Prisma.CrawlingCUCreateManyInput = {
        name,
        price,
        img,
        barcode,
        eventType,
        badge,
        ...details,
      };

      arr.push(obj);
    }

    console.log('유효 이벤트 상품 갯수', arr.length);
    return arr;
  }

  private async crawlItemDetails(
    item: Locator
  ): Promise<Pick<Prisma.CrawlingCUCreateManyInput, 'description' | 'tag'>> {
    const attr = await item.locator('div.prod_img').getAttribute('onclick');
    if (!attr) return {};
    const itemId = /\d+/.exec(attr)?.[0];
    if (!itemId) return {};

    const context = await this.browser.newContext();
    const page = await context.newPage();
    await page.goto(this.detailURL + itemId);
    await page.waitForLoadState('networkidle');

    const description = await page.locator('.prodExplain').innerText();
    let tag = await page.locator('#taglist').innerText();
    tag = tag.replace(/\n/g, '|');

    await page.close();

    return {
      description,
      tag,
    };
  }
}
