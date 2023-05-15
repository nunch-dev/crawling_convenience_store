import { Crawlable } from './crawlable';
import { Prisma } from '@prisma/client';
import { chromium, Locator, Page } from '@playwright/test';

export class SEVEN extends Crawlable<Prisma.CrawlingSevenCreateManyInput> {
  private readonly IMAGE_PATH = 'https://www.7-eleven.co.kr';
  private readonly eventURL =
    'https://www.7-eleven.co.kr/product/presentList.asp';

  constructor() {
    super();
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async run() {
    await this.init();

    const result: Prisma.CrawlingSevenCreateManyInput[] = [];

    const opo = await this.getOnePlusOneItems();
    result.push(...opo);
    const tpo = await this.getTwoPlusOneItems();
    result.push(...tpo);

    const gift = await this.getGiftItems();
    result.push(...gift);

    const sales = await this.getSalesItems();
    result.push(...sales);

    await this.browser.close();
    return result;
  }

  private async clickTab(page: Page, tab: string) {
    await page.evaluate((tab) => (window as any).fncTab(tab), tab);
    await page.waitForLoadState('load');
  }

  private async getOnePlusOneItems() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.eventURL);
    await page.waitForLoadState('load');

    console.log('1+1 크롤링 시작');
    await this.clickTab(page, '1');

    console.log('아이템 로드 중...');
    await this.loadAllItems(page);
    console.log('아이템 로드 완료');

    console.log('데이터 수집 시작');
    const result = await this.crawlBasic(page);
    await context.close();
    console.log('데이터 수집 완료');
    return result;
  }

  private async getTwoPlusOneItems() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.eventURL);
    await page.waitForLoadState('load');

    console.log('2+1 크롤링 시작');
    await this.clickTab(page, '2');

    console.log('아이템 로드 중...');
    await this.loadAllItems(page);
    console.log('아이템 로드 완료');

    console.log('데이터 수집 시작');
    const result = await this.crawlBasic(page);
    await context.close();
    console.log('데이터 수집 완료');
    return result;
  }

  private async getGiftItems() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.eventURL);
    await page.waitForLoadState('load');

    console.log('증정행사 크롤링 시작');
    await this.clickTab(page, '3');

    console.log('아이템 로드 중...');
    await this.loadAllItems(page);
    console.log('아이템 로드 완료');

    console.log('데이터 수집 시작');
    const result = await this.crawlGift(page);
    await context.close();
    console.log('데이터 수집 완료');
    return result;
  }

  private async getSalesItems() {
    const context = await this.browser.newContext();
    const page = await context.newPage();

    await page.goto(this.eventURL);
    await page.waitForLoadState('load');

    console.log('할인행사 크롤링 시작');
    await this.clickTab(page, '4');

    console.log('아이템 로드 중...');
    await this.loadAllItems(page);
    console.log('아이템 로드 완료');

    console.log('데이터 수집 시작');
    const result = await this.crawlSales(page);
    await context.close();
    console.log('데이터 수집 완료');
    return result;
  }

  private async loadAllItems(page: Page) {
    let prevCount;

    while (true) {
      // moreBtn click
      try {
        const moreBtn = await page.locator('.btn_more').locator('a');
        await moreBtn.click();
        await page.waitForTimeout(1000);
      } catch {
        break;
      }

      // check
      try {
        const currentValue = await page.locator('#listCnt').inputValue();
        if (prevCount === currentValue) break;
        prevCount = currentValue;
      } catch {
        break;
      }
    }
  }

  private async getProduct(
    item: Locator
  ): Promise<
    Pick<
      Prisma.CrawlingSevenCreateManyInput,
      'name' | 'price' | 'img' | 'barcode'
    >
  > {
    const name = await item
      .locator('.pic_product')
      .locator('.infowrap')
      .locator('.name')
      .innerText();
    let priceString = await item
      .locator('.pic_product')
      .locator('.infowrap')
      .locator('.price')
      .innerText();
    priceString = priceString.replace(/[,원]/g, '');
    const price = Number(priceString);

    let img = await item
      .locator('.pic_product')
      .locator('img')
      .getAttribute('src');
    let barcode = img?.split('.')[0].replace(/[\/\D]+/g, '') || '';
    img = this.IMAGE_PATH + img;

    return {
      name,
      price,
      img,
      barcode,
    };
  }

  private async crawlBasic(page: Page) {
    const arr: Prisma.CrawlingSevenCreateManyInput[] = [];

    const items = await page.locator('#listUl > li').all();

    const eventType = await items[0].innerText();

    for (let i = 1; i < items.length; i++) {
      const item = items[i];

      try {
        const { name, price, img, barcode } = await this.getProduct(item);
        const obj: Prisma.CrawlingSevenCreateManyInput = {
          name,
          price,
          eventType,
          img,
          barcode,
        };
        arr.push(obj);
      } catch {
        console.log(eventType, `${i}번째 아이템 에러 발생`);
      }
    }

    return arr;
  }

  private async crawlGift(page: Page) {
    const arr: Prisma.CrawlingSevenCreateManyInput[] = [];

    const items = await page.locator('#listUl > li').all();

    for (let i = 1; i < items.length; i++) {
      const group = items[i];

      try {
        // 아이템이 더보기 버튼이면 종료
        await group.locator('.btn_more');
      } catch {
        break;
      }

      const item = await group.locator('.btn_product_01');
      const gift = await group.locator('.btn_product_02');

      try {
        // item
        const { name, price, img, barcode } = await this.getProduct(item);
        // gift
        const {
          name: giftName,
          price: giftPrice,
          img: giftImg,
          barcode: giftBarcode,
        } = await this.getProduct(gift);

        const obj: Prisma.CrawlingSevenCreateManyInput = {
          name,
          price,
          eventType: '덤증정',
          img,
          barcode,
          giftName,
          giftPrice,
          giftImg,
          giftBarcode: giftBarcode === '01' ? null : giftBarcode, // 01은 에러
        };
        arr.push(obj);
      } catch {
        console.log(`덤증정, ${i}번째 아이템 에러 발생`);
      }
    }

    return arr;
  }

  private async crawlSales(page: Page) {
    const arr: Prisma.CrawlingSevenCreateManyInput[] = [];

    const items = await page.locator('#listUl > li').all();

    await page.addScriptTag({
      content: `fncGoView = (pCd) => {
            $("#pCd").val(pCd);
            $("#actFrm").attr("target", "_blank");
            $("#actFrm").attr("action", "presentView.asp").submit();
          }`,
    });

    for (let i = 1; i < items.length; i++) {
      const item = items[i];

      try {
        const { name, price, img, barcode } = await this.getProduct(item);
        const obj: Prisma.CrawlingSevenCreateManyInput = {
          name,
          price,
          eventType: '할인',
          img,
          barcode,
        };

        const originalPrice = await this.getDetail(item, page);
        obj.originalPrice = originalPrice === 0 ? price : originalPrice;

        arr.push(obj);
      } catch {
        console.log(`할인상품 ${i}번째 아이템 에러 발생`);
      }
    }

    return arr;
  }

  private async getDetail(item: Locator, page: Page) {
    const link = await item.getByRole('link');
    const pagePromise = page.context().waitForEvent('page');
    await link.click();
    const detailPage = await pagePromise;
    await detailPage.waitForLoadState();

    const originalPrice = await detailPage
      .locator('.product_price')
      .locator('del')
      .innerText({ timeout: 1000 });

    await detailPage.close();

    if (isNaN(Number(originalPrice))) return 0;

    return Number(originalPrice);
  }
}
