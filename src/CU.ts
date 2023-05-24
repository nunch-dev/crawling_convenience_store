import { Crawlable } from './crawlable';
import axios from 'axios';
import { load } from 'cheerio';

export interface CUGoods {
  barcode: string;
  name: string;
  price: number;
  img: string;
  eventType: string | null;
  isNew: boolean;
  badge: string;
  category: string;
  description?: string | null;
  tag?: string | null;
  createdAt?: Date;
}

export class CU extends Crawlable<CUGoods> {
  private readonly listURL = 'https://cu.bgfretail.com/product/productAjax.do';
  private readonly detailURL =
    'https://cu.bgfretail.com/product/view.do?category=product&gdIdx=';

  private readonly category = {
    10: '간편식사',
    20: '즉석조리',
    30: '과자류',
    40: '아이스크림',
    50: '식품',
    60: '음료',
    70: '생활용품',
  };

  async run() {
    return await this.scrapeList();
  }

  private async scrapeList() {
    const entries = Object.entries(this.category);
    const result: CUGoods[] = [];
    for (let i = 0; i < entries.length; i++) {
      const items = await this.scrapeType(entries[i]);
      result.push(...items);
    }

    return result;
  }

  private async scrapeType([categoryCode, category]: [string, string]) {
    let pageIndex = 1;
    const result: CUGoods[] = [];

    while (true) {
      console.log(`${category} 상품 ${pageIndex} 페이지 크롤링 중`);
      const html = await axios.get(this.listURL, {
        params: {
          pageIndex,
          searchMainCategory: categoryCode,
          searchSubCategory: '',
          listType: pageIndex === 1 ? 0 : '',
          searchCondition: pageIndex === 1 ? '' : 'setA',
          searchUseYn: '',
          gdIdx: 0,
          codeParent: categoryCode,
          user_id: '',
          search1: '',
          search2: '',
          searchKeyword: '',
        },
      });

      const $ = load(html.data);
      const $list = $('.prodListWrap ul');
      const $items = $list.find('li.prod_list');

      for (const el of $items.toArray()) {
        const $item = $(el);
        const eventType = $item.find('.badge').text().trim() || null;
        const badge =
          $item.find('.tag span').attr('class')?.trim().toUpperCase() || 'NONE';

        if (badge === 'NONE' && !eventType) continue;

        const name = $item.find('.prod_text .name').text().trim();
        const priceString = $item.find('.prod_text .price').text().trim();
        const price = Number(priceString.replace(/[,원]/g, ''));

        const img = $item.find('div.prod_img img').attr('src')?.trim();
        const imgAlt = $item.find('div.prod_img img').attr('alt')?.trim();
        const barcode = imgAlt?.split('.')[0];
        if (!barcode) continue;

        let itemId = $item.find('div.prod_img').attr('onclick')?.trim();
        if (itemId) itemId = /\d+/.exec(itemId)?.[0];

        // const { description, tag } = await this.getDetails(itemId);

        result.push({
          eventType,
          category,
          badge,
          name,
          price,
          isNew: badge === 'NEW',
          img: img || '',
          barcode,
          // description,
          // tag,
        });
      }

      const $nextBtn = $('.prodListBtn').is('div');
      if (!$nextBtn) break;
      else pageIndex++;
    }

    console.log(`${category} 상품 크롤링 완료, ${result.length}개 상품`);
    return result;
  }

  private async getDetails(id?: string) {
    if (!id) return { description: null, tag: null };
    const url = `${this.detailURL}${id}`;
    const response = await axios.get(url);
    const $ = load(response.data);
    const description = $('.prodExplain').text().trim();
    const tag = $('#taglist').children('li').text().split(' ').join('|');

    return { description, tag };
  }
}
