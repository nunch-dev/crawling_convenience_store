import { PrismaClient } from '@prisma/client';

class PrismaDB {
  private static instance: PrismaDB;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): PrismaDB {
    if (!PrismaDB.instance) {
      PrismaDB.instance = new PrismaDB();
    }

    return PrismaDB.instance;
  }
}

export const Database = PrismaDB.getInstance();
