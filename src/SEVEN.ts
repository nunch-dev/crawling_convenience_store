import { Crawlable } from './crawlable';
import axios from 'axios';
import { load } from 'cheerio';
import * as fs from 'fs';

interface SevenGoods {
  barcode: string | null;
  name: string;
  price: number;
  img: string;
  eventType: string;
  isNew: boolean;

  giftName?: string;
  giftPrice?: number;
  giftImg?: string;
  giftBarcode?: string | null;
  originalPrice?: number | null;
  createdAt?: Date;

  scrapId?: string;
}

export class SEVEN extends Crawlable<SevenGoods> {
  private readonly IMAGE_PATH = 'https://www.7-eleven.co.kr';
  private readonly FIRST_CRAWLING_URL =
    'https://www.7-eleven.co.kr/product/presentList.asp';
  private readonly AJAX_CALL_URL =
    'https://www.7-eleven.co.kr/product/listMoreAjax.asp';
  private readonly DEFAULT_IMAGE_URL = '/front/img/product/product_list_01.jpg';

  private readonly category = {
    1: '1+1',
    2: '2+1',
    3: '덤증정',
    4: '할인',
  };

  private newProducts: string[] = [];

  async run() {
    await this.scrapeNewProducts();
    return await this.scrapeList();
  }

  // 신상품 체크
  private async scrapeNewProducts() {
    const resp = await axios.get(this.FIRST_CRAWLING_URL, {
      params: {
        cateCd1: '',
        cateNm1: '',
        cateCd2: '',
        cateNm2: '',
        cateCd3: '',
        cateNm3: '',
        pTab: 8, // 신상품
        pCd: '',
        initPageSize: '',
      },
    });

    const result = await this.firstScraping(resp, '8');
    result.forEach((v) => this.newProducts.push(v.scrapId!));
  }

  private async scrapeList() {
    const entries = Object.entries(this.category);
    const result: SevenGoods[] = [];

    for (let i = 0; i < entries.length; i++) {
      const items = await this.scrapeType(entries[i]);
      result.push(...items);
    }

    return result.map(({ scrapId, ...rest }) => rest);
  }

  private async scrapeType([categoryCode, eventType]: [string, string]) {
    console.log(`${eventType} 상품 크롤링 중`);
    const resp = await axios.get(this.FIRST_CRAWLING_URL, {
      params: {
        cateCd1: '',
        cateNm1: '',
        cateCd2: '',
        cateNm2: '',
        cateCd3: '',
        cateNm3: '',
        pTab: categoryCode,
        pCd: '',
        initPageSize: '',
      },
    });
    let result;
    if (categoryCode === '3') {
      result = await this.firstScrapingGift(resp, categoryCode);
    } else {
      result = await this.firstScraping(resp, categoryCode);
    }

    if (categoryCode === '4') {
      console.log('원가 크롤링 시작');
      for (let i = 0; i < result.length; i++) {
        result[i].originalPrice = await this.getOriginalPrice(
          result[i].scrapId
        );
      }
      console.log('원가 크롤링 종료');
    }
    console.log(`${eventType} 상품 크롤링 완료`);
    return result.map((v) => ({
      ...v,
      eventType,
    })) as SevenGoods[];
  }

  // 1+1 / 2+1 / 할인
  private async firstScraping(resp: any, code: string) {
    const $ = load(resp.data);
    const $list = $('#listUl');
    const $items = $list.find('> li').toArray();

    const result: Omit<SevenGoods, 'eventType'>[] = [];

    for (let i = 0; i < $items.length - 1; i++) {
      if (i === 0) continue;

      const el = $items[i];
      const $item = $(el);

      const name = $item.find('.pic_product > .infowrap > .name').text().trim();
      const priceString = $item
        .find('.pic_product > .infowrap > .price')
        .text()
        .trim();
      const price = Number(priceString.replace(/[,원]/g, ''));
      const imgSrc = $item.find('.pic_product > img').attr('src');
      const img = `${this.IMAGE_PATH}${imgSrc}`;
      let barcode: string | null =
        imgSrc?.split('.')[0].replace(/[\/\D]+/g, '') || null;
      if (this.DEFAULT_IMAGE_URL === imgSrc) barcode = null;
      const href = $item.find('a.btn_product_01').attr('href');
      const scrapId = href?.replace(/[\/\D]+/g, '');

      result.push({
        barcode,
        name,
        price,
        img,
        isNew: this.newProducts.includes(scrapId || ''),
        scrapId,
      });
    }

    const hasMore = $list.find('.btn_more').is('li');
    if (hasMore) {
      let page = 2;
      while (true) {
        const params: Record<string, any> = {
          intPageSize: 10,
          pTab: code,
          cateCd1: '',
          cateCd2: '',
          cateCd3: '',
        };
        if (page > 2) {
          params.intCurrPage = page;
        }
        const moreResp = await axios.get(
          'https://www.7-eleven.co.kr/product/listMoreAjax.asp',
          {
            params,
          }
        );

        const data = await this.secondScraping(moreResp);
        const [items, isGoAhead] = data;
        if (!isGoAhead) break;
        result.push(...items);
        page++;
      }
    }

    return result;
  }

  // 1+1 / 2+1 / 할인
  private async secondScraping(resp: any) {
    const $ = load(resp.data);
    const $items = $('li:not(.ico_tag_*)').toArray();
    if ($items.length > 1) fs.writeFileSync('test.html', resp.data);

    const result: Omit<SevenGoods, 'eventType'>[] = [];
    for (let i = 0; i < $items.length - 1; i++) {
      const el = $items[i];
      const $item = $(el);

      const name = $item.find('.pic_product > .infowrap > .name').text().trim();
      if (!name) continue;
      const priceString = $item
        .find('.pic_product > .infowrap > .price')
        .text()
        .trim();
      const price = Number(priceString.replace(/[,원]/g, ''));
      const imgSrc = $item.find('.pic_product > img').attr('src');
      const img = `${this.IMAGE_PATH}${imgSrc}`;
      let barcode: string | null =
        imgSrc?.split('.')[0].replace(/[\/\D]+/g, '') || null;
      if (this.DEFAULT_IMAGE_URL === imgSrc) barcode = null;
      const href = $item.find('a.btn_product_01').attr('href');
      const scrapId = href?.replace(/[\/\D]+/g, '');

      result.push({
        barcode,
        name,
        price,
        img,
        isNew: this.newProducts.includes(scrapId || ''),
        scrapId,
      });
    }

    const isGoAhead = $items.length > 1;
    return [result, isGoAhead] as [Omit<SevenGoods, 'eventType'>[], boolean];
  }

  // 덤증정
  private async firstScrapingGift(resp: any, code: string) {
    const $ = load(resp.data);
    const $list = $('#listUl');
    const $items = $list.find('> li').toArray();

    const result: Omit<SevenGoods, 'eventType'>[] = [];

    for (let i = 0; i < $items.length - 1; i++) {
      if (i === 0) continue;

      const el = $items[i];
      const $item = $(el).find('a.btn_product_01');
      const itemHref = $item.attr('href');
      const scrapId = itemHref?.replace(/[\/\D]+/g, '');
      //NOTE 증정품은 신상품이 없다고 가정

      const $gift = $(el).find('a.btn_product_02');

      // 기본 상품
      const name = $item.find('.pic_product > .infowrap > .name').text().trim();
      const priceString = $item
        .find('.pic_product > .infowrap > .price')
        .text()
        .trim();
      const price = Number(priceString.replace(/[,원]/g, ''));
      const imgSrc = $item.find('.pic_product > img').attr('src');
      const img = `${this.IMAGE_PATH}${imgSrc}`;
      let barcode: string | null =
        imgSrc?.split('.')[0].replace(/[\/\D]+/g, '') || null;
      if (this.DEFAULT_IMAGE_URL === imgSrc) barcode = null;

      // 증정품
      const giftName = $gift
        .find('.pic_product > .infowrap > .name')
        .text()
        .trim();
      const giftPriceString = $gift
        .find('.pic_product > .infowrap > .price')
        .text()
        .trim();
      const giftPrice = Number(giftPriceString.replace(/[,원]/g, ''));
      const giftImgSrc = $gift.find('.pic_product > img').attr('src');
      const giftImg = `${this.IMAGE_PATH}${giftImgSrc}`;
      let giftBarcode: string | null =
        giftImgSrc?.split('.')[0].replace(/[\/\D]+/g, '') || null;
      if (this.DEFAULT_IMAGE_URL === giftImgSrc) giftBarcode = null;

      result.push({
        barcode,
        name,
        price,
        img,
        isNew: this.newProducts.includes(scrapId || ''),
        giftName,
        giftPrice,
        giftImg,
        giftBarcode,
        scrapId,
      });
    }

    const hasMore = $list.find('.btn_more').is('li');
    if (hasMore) {
      let page = 2;
      while (true) {
        const params: Record<string, any> = {
          intPageSize: 10,
          pTab: code,
          cateCd1: '',
          cateCd2: '',
          cateCd3: '',
        };
        if (page > 2) {
          params.intCurrPage = page;
        }
        const moreResp = await axios.get(
          'https://www.7-eleven.co.kr/product/listMoreAjax.asp',
          {
            params,
          }
        );

        const data = await this.secondScrapingGift(moreResp);
        const [items, isGoAhead] = data;
        if (!isGoAhead) break;
        result.push(...items);
        page++;
      }
    }

    return result;
  }

  // 덤증정
  private async secondScrapingGift(resp: any) {
    const $ = load(resp.data);
    const $items = $('li:not(.ico_tag_*)').toArray();
    if ($items.length > 1) fs.writeFileSync('test.html', resp.data);

    const result: Omit<SevenGoods, 'eventType'>[] = [];
    for (let i = 0; i < $items.length - 1; i++) {
      const el = $items[i];
      const $item = $(el).find('a.btn_product_01');
      const itemHref = $item.attr('href');
      const scrapId = itemHref?.replace(/[\/\D]+/g, '');
      //NOTE 증정품은 신상품이 없다고 가정

      const $gift = $(el).find('a.btn_product_02');

      // 기본 상품
      const name = $item.find('.pic_product > .infowrap > .name').text().trim();
      if (!name) continue;
      const priceString = $item
        .find('.pic_product > .infowrap > .price')
        .text()
        .trim();
      const price = Number(priceString.replace(/[,원]/g, ''));
      const imgSrc = $item.find('.pic_product > img').attr('src');
      const img = `${this.IMAGE_PATH}${imgSrc}`;
      let barcode: string | null =
        imgSrc?.split('.')[0].replace(/[\/\D]+/g, '') || null;
      if (this.DEFAULT_IMAGE_URL === imgSrc) barcode = null;

      // 증정품
      const giftName = $gift
        .find('.pic_product > .infowrap > .name')
        .text()
        .trim();
      const giftPriceString = $gift
        .find('.pic_product > .infowrap > .price')
        .text()
        .trim();
      const giftPrice = Number(giftPriceString.replace(/[,원]/g, ''));
      const giftImgSrc = $gift.find('.pic_product > img').attr('src');
      const giftImg = `${this.IMAGE_PATH}${giftImgSrc}`;
      let giftBarcode: string | null =
        giftImgSrc?.split('.')[0].replace(/[\/\D]+/g, '') || null;
      if (this.DEFAULT_IMAGE_URL === giftImgSrc) giftBarcode = null;

      result.push({
        barcode,
        name,
        price,
        img,
        isNew: this.newProducts.includes(scrapId || ''),
        giftName,
        giftPrice,
        giftImg,
        giftBarcode,
        scrapId,
      });
    }

    const isGoAhead = $items.length > 1;
    return [result, isGoAhead] as [Omit<SevenGoods, 'eventType'>[], boolean];
  }

  // 원가 확인
  private async getOriginalPrice(scrapId?: string) {
    if (!scrapId) return;
    const resp = await axios.get(
      'https://www.7-eleven.co.kr/product/presentView.asp',
      {
        params: {
          pCd: scrapId,
        },
      }
    );

    const $ = load(resp.data);
    const originalPrice = $('.product_price del').text().replace(/\D+/g, '');
    const discountPrice = $('.product_price strong').text().replace(/\D+/g, '');

    return Number(originalPrice || discountPrice);
  }
}
