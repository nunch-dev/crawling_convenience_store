import { Crawlable } from './crawlable';
import { chromium } from '@playwright/test';
import axios from 'axios';

interface GSResponse {
  results: EventGoods[];
  SubPageListData: EventGoods[];
  pagination: {
    totalNumberOfResults: number;
    numberOfPages: number;
    pageSize: number;
    currentPage: number;
  };
}

interface EventGoods {
  eventTypeNm: '덤증정' | '2+1' | '1+1'; // 이벤트 타입
  goodsNm: string; // 상품명
  giftAttFileNm?: string; // 덤증정 상품 이미지 / 바코드처리
  price: number;
  giftGoodsNm?: string; // 덤증정 상품명
  giftPrice?: number;
  attFileNm: string; // 상품 이미지 / 바코드 처리
  isNew?: string; // 신선식품과 PB 상품의 신상품 여부
}

interface GSGoods {
  barcode: string;
  name: string;
  price: number;
  img: string;
  eventType: string;
  isNew: boolean;

  giftName?: string;
  giftPrice?: number;
  giftImg?: string;
  giftBarcode?: string;
  createdAt?: Date;
}

export class GS extends Crawlable<GSGoods> {
  private token: string;

  // 이벤트 상품
  private readonly eventGoodsURL =
    'http://gs25.gsretail.com/gscvs/ko/products/event-goods';

  private async init() {
    this.browser = await chromium.launch({ headless: true });
    this.token = await this.getCSRFToken();
    await this.browser.close();
  }

  private async getCSRFToken() {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    await page.goto(this.eventGoodsURL);
    await page.waitForLoadState('networkidle');
    return await page.locator('form#CSRFForm').locator('input').inputValue();
  }

  async run() {
    // await this.init();
    const result: GSGoods[] = [];

    const event = await this.scrapeEventGoods();
    result.push(...event);
    const freshFood = await this.scrapeFreshFoods();
    result.push(...freshFood);
    const pb = await this.scrapePBs();
    result.push(...pb);

    return result;
  }

  private async scrapeEventGoods() {
    const requestURL =
      'http://gs25.gsretail.com/gscvs/ko/products/event-goods-search';
    const GSGoods: GSGoods[] = [];

    let pageNum = 1;
    while (true) {
      console.log(`이벤트 상품 ${pageNum}페이지 크롤링 중`);
      const resp = await axios.get(
        `${requestURL}?CSRFTOKEN=${this.token}&pageNum=${pageNum}&pageSize=100&searchType=&searchWord=&parameterList=TOTAL`
      );

      const { results } = JSON.parse(resp.data) as GSResponse;
      if (results.length === 0) break;

      results.forEach((item) => {
        const barcode =
          /GD_(?<barcode>\d+)/.exec(item.attFileNm)?.groups?.barcode || '';
        const goods: GSGoods = {
          name: item.goodsNm,
          price: item.price,
          img: item.attFileNm,
          eventType: item.eventTypeNm,
          isNew: false,
          barcode,
        };

        if (item.eventTypeNm === '덤증정') {
          goods.giftName = item.giftGoodsNm;
          goods.giftPrice = item.giftPrice;
          goods.giftImg = item.giftAttFileNm;
          goods.giftBarcode =
            /GD_(?<barcode>\d+)/.exec(item.giftAttFileNm!)?.groups?.barcode ||
            '';
        }

        GSGoods.push(goods);
      });

      pageNum++;
    }
    console.log(`이벤트 상품 크롤링 완료, ${GSGoods.length}개 상품`);
    return GSGoods;
  }

  private async scrapeFreshFoods() {
    const requestURL =
      'http://gs25.gsretail.com/products/youus-freshfoodDetail-search';
    const GSGoods: GSGoods[] = [];

    let pageNum = 1;
    while (true) {
      console.log(`신선식품 ${pageNum}페이지 크롤링 중`);
      const resp = await axios.get(
        `${requestURL}?CSRFTOKEN=${this.token}&pageNum=${pageNum}&pageSize=100&searchWord=&searchHPrice=&searchTPrice=&searchSrvFoodCK=FreshFoodKey&searchSort=searchALLSort&searchProduct=productALL`
      );

      const { SubPageListData: results } = JSON.parse(resp.data) as GSResponse;
      if (results.length === 0) break;

      results.forEach((item) => {
        const barcode =
          /GD_(?<barcode>\d+)/.exec(item.attFileNm)?.groups?.barcode || '';
        const goods: GSGoods = {
          name: item.goodsNm,
          price: item.price,
          img: item.attFileNm,
          eventType: item.eventTypeNm,
          isNew: item.isNew === 'T',
          barcode,
        };

        GSGoods.push(goods);
      });

      pageNum++;
    }

    console.log(`신선식품 크롤링 완료, ${GSGoods.length}개 상품`);
    return GSGoods;
  }

  private async scrapePBs() {
    const requestURL =
      'http://gs25.gsretail.com/products/youus-freshfoodDetail-search';
    const GSGoods: GSGoods[] = [];

    let pageNum = 1;
    while (true) {
      console.log(`PB상품 ${pageNum}페이지 크롤링 중`);
      const resp = await axios.get(
        `${requestURL}?CSRFTOKEN=${this.token}&pageNum=${pageNum}&pageSize=100&searchWord=&searchHPrice=&searchTPrice=&searchSrvFoodCK=DifferentServiceKey&searchSort=searchALLSort&searchProduct=productALL`
      );

      const { SubPageListData: results } = JSON.parse(resp.data) as GSResponse;
      if (results.length === 0) break;

      results.forEach((item) => {
        const barcode =
          /GD_(?<barcode>\d+)/.exec(item.attFileNm)?.groups?.barcode || '';
        const goods: GSGoods = {
          name: item.goodsNm,
          price: item.price,
          img: item.attFileNm,
          eventType: item.eventTypeNm,
          isNew: item.isNew === 'T',
          barcode,
        };

        GSGoods.push(goods);
      });

      pageNum++;
    }

    console.log(`PB상품 크롤링 완료, ${GSGoods.length}개 상품`);
    return GSGoods;
  }
}
