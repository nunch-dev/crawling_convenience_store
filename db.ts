import { createConnection } from 'mysql2/promise';

async function main() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_DATABASE || 'db',
  });

  const values = [];
  for (let i = 1; i < 2000; i++) {
    const value = [
      12341234,
      '테스트',
      i,
      'asdf',
      '1+1',
      null,
      null,
      null,
      null,
      1,
    ];
    values.push(value);
  }

  try {
    await connection.beginTransaction();
    const sql =
      'INSERT INTO cs.CrawlingGS (barcode, name, price, img, eventType, giftName, giftPrice, giftImg, giftBarcode, isNew) VALUES ?';
    const result = await connection.query(sql, [values]);
    console.log(result.length);

    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.log('Transaction rolled back.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
