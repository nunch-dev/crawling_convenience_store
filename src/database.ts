import { createPool, OkPacket, Pool } from 'mysql2/promise';
import 'dotenv/config';
import { GSGoods } from './GS';
import { CUGoods } from './CU';
import { SevenGoods } from './SEVEN';

export class Database {
  private pool: Pool;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.pool = await createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'db',
        enableKeepAlive: true,
      });
    } catch {
      console.error('DB 연결 실패');
      console.log('Environment Variable을 확인해주세요.');
    }
  }

  async close() {
    await this.pool.end();
  }

  async insert<T>(target: 'CU' | 'GS' | 'SEVEN', data: T[]) {
    let sql = '';
    let values = [];
    switch (target) {
      case 'CU':
        sql =
          'INSERT INTO cs.CrawlingCU(barcode, name, price, img, eventType, isNew, badge, category) VALUES ?';
        values = this.makeCUValues(data as CUGoods[]);
        return await this.execute(sql, values);
      case 'GS':
        sql =
          'INSERT INTO cs.CrawlingGS(barcode, name, price, img, eventType, giftBarcode, giftName, giftPrice, giftImg, isNew) VALUES ?';
        values = this.makeGSValues(data as GSGoods[]);
        return await this.execute(sql, values);
      case 'SEVEN':
        sql =
          'INSERT INTO cs.CrawlingSeven(barcode, name, price, img, eventType, giftBarcode, giftName, giftPrice, giftImg, originalPrice, isNew) VALUES ?';
        values = this.makeSevenValues(data as []);
        return await this.execute(sql, values);
    }
  }

  private async execute(sql: string, values: any[]) {
    const connection = await this.pool.getConnection();

    let result = 0;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(sql, [values]);
      result = (rows as OkPacket).affectedRows;
      await connection.commit();
    } catch (e) {
      console.error(e);
      await connection.rollback();
      console.log('Transaction rolled back.');
    } finally {
      console.log('Transaction finished.');
      connection.release();
    }

    return result;
  }

  private makeGSValues(data: GSGoods[]) {
    const values = [];
    for (const item of data) {
      const value = [
        item.barcode,
        item.name,
        item.price,
        item.img,
        item.eventType || '',
        item.giftBarcode,
        item.giftName,
        item.giftPrice,
        item.giftImg,
        item.isNew,
      ];
      values.push(value);
    }
    return values;
  }

  private makeCUValues(data: CUGoods[]) {
    const values = [];
    for (const item of data) {
      const value = [
        item.barcode,
        item.name,
        item.price,
        item.img,
        item.eventType || '',
        item.isNew,
        item.badge,
        item.category,
      ];

      values.push(value);
    }

    return values;
  }

  private makeSevenValues(data: SevenGoods[]) {
    const values = [];
    for (const item of data) {
      const value = [
        item.barcode || '01',
        item.name,
        item.price,
        item.img,
        item.eventType,
        item.giftBarcode || '',
        item.giftName,
        item.giftPrice,
        item.giftImg,
        item.originalPrice,
        item.isNew,
      ];

      values.push(value);
    }

    return values;
  }
}
