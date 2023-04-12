import { Crawlable } from './crawlable';
import { Prisma } from '@prisma/client';
import { chromium, Locator, Page } from '@playwright/test';
import * as fs from 'fs';

export class CU extends Crawlable<Prisma.CrawlingCUCreateManyInput> {
  // Product 리스트 URL
  private readonly baseURL =
    'https://cu.bgfretail.com/product/product.do?category=product&depth2=4&depth3=';

  // 1: 간편식사, 2: 즉석조리, 3: 과자류, 4: 아이스크림, 5: 식품, 6: 음료, 7: 생활용품
  private readonly types = ['1', '2', '3', '4', '5', '6', '7'];

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

    for (let i = 0; i < this.types.length; i++) {
      const data = await this.crawling(this.types[i]);
      result.push(...data);
    }

    await this.browser.close();
    fs.writeFileSync('cu.json', JSON.stringify(result));

    return result;
  }

  private async crawling(pageType: string) {
    const context = await this.browser.newContext();
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
  }

  private async crawlItems(page: Page) {
    const items = await page.locator('.prod_list').all();
    const arr: Prisma.CrawlingCUCreateManyInput[] = [];
    if (!items) return arr;
    console.log(items.length);

    for (const item of items) {
      // 1+1 or 2+1
      const eventType = await item.locator('.badge').innerText();
      // 이벤트가 없는 항목은 스킵
      if (!eventType) continue;

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
        ...details,
      };

      arr.push(obj);
    }

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
    tag = tag.replace(/\\n/g, '|');

    await page.close();

    return {
      description,
      tag,
    };
  }
}
