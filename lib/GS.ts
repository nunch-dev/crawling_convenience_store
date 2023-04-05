import { Crawler } from './crawler';
import { ConvenienceType } from '../interfaces/types';
import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';

export class GS extends Crawler {
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
    super(ConvenienceType.GS);
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async run() {
    await this.init();
    await this.crawlEventGoods();
    await this.crawlFreshFood();
    await this.crawlPB();
    await this.browser.close();
  }

  private async crawlItems(page: Page) {
    const list = await page.locator('.prod_list').all();
    const items = await list.at(-1)?.locator('li').all();
    if (!items) return;

    const arr = [];

    for (const item of items) {
      const name = await item.locator('p.tit').first().innerText();
      const price = await item
        .locator('p.price')
        .first()
        .locator('.cost')
        .innerText();
      const img = await item
        .locator('p.img')
        .first()
        .locator('img')
        .getAttribute('src');
      let barcode = null;
      if (img) barcode = /(?:GD_)(?<barcode>\d+)/.exec(img)?.groups?.barcode;

      const eventType = await item.locator('.flag_box p > span').innerText();

      const gift = await item.locator('.dum_box');
      const giftAll = await gift.all();
      const hasGift = giftAll.length > 0;

      let giftObject;
      if (hasGift) {
        const giftName = await gift.locator('p.name').innerText();
        const giftPrice = await gift.locator('p.price .cost').innerText();
        const giftImg = await gift.locator('p.img img').getAttribute('src');
        let giftBarcode = null;
        if (giftImg)
          giftBarcode = /(?:GD_)(?<barcode>\d+)/.exec(giftImg)?.groups?.barcode;

        giftObject = {
          name: giftName,
          price: giftPrice,
          img: giftImg,
          barcode: giftBarcode,
        };
      }

      const payload = {
        name,
        price,
        img,
        barcode,
        eventType,
        gift: giftObject,
      };
      arr.push(payload);
    }

    return arr;
  }

  private async crawlEventGoods() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.eventGoodsURL);
    await page.waitForLoadState('networkidle');

    const showAllEventGoodsButton = await page.locator('#TOTAL');
    await showAllEventGoodsButton.click();

    await page.waitForLoadState('networkidle');

    const arr = await this.crawlItems(page);

    fs.writeFileSync('event.json', JSON.stringify(arr));
  }

  private async crawlFreshFood() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.freshFoodURL);
    await page.waitForLoadState('networkidle');

    const arr = await this.crawlItems(page);

    fs.writeFileSync('freshfood.json', JSON.stringify(arr));
  }

  private async crawlPB() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.pbURL);
    await page.waitForLoadState('networkidle');

    const arr = await this.crawlItems(page);

    fs.writeFileSync('pb.json', JSON.stringify(arr));
  }
}
