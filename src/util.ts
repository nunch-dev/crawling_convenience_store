import { Database } from './database';
import typia from 'typia';
import { Prisma } from '@prisma/client';

export function isEmptyObject(obj: any) {
  return Object.keys(obj).length === 0;
}

export async function upsert(
  data:
    | Prisma.CrawlingSevenCreateManyInput[]
    | Prisma.CrawlingCUCreateManyInput[]
    | Prisma.CrawlingGSCreateManyInput[]
) {
  const db = Database.getClient();

  const isSeven = typia.is<Prisma.CrawlingSevenCreateManyInput[]>(data);
  const isCU = typia.is<Prisma.CrawlingCUCreateManyInput[]>(data);
  const isGS = typia.is<Prisma.CrawlingGSCreateManyInput[]>(data);

  let result = 0;
  const payload = {
    data,
    skipDuplicates: false,
  };

  if (isSeven) {
    const { count } = await db.crawlingSeven.createMany(payload);
    result = count;
  } else if (isCU) {
    const { count } = await db.crawlingCU.createMany(payload);
    result = count;
  } else if (isGS) {
    const { count } = await db.crawlingGS.createMany(payload);
    result = count;
  } else {
    throw new Error('Invalid Data Type');
  }

  console.log('Create Many Result: ', result);

  await db.$disconnect();
}
