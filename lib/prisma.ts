// PrismaClient クラスをインポート
import { PrismaClient } from '@prisma/client';
// Prisma 用の PostgreSQL アダプターをインポート
import { PrismaPg } from '@prisma/adapter-pg';
// pg ライブラリの Pool クラスをインポート
import { Pool } from 'pg';

// グローバル空間に prisma インスタンスを保持するための型拡張
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 環境変数からデータベース接続文字列を取得
const connectionString = process.env.DATABASE_URL;

// PostgreSQL 接続プールを生成
const pool = new Pool({ connectionString });
// Prisma アダプターを生成
const adapter = new PrismaPg(pool);

// PrismaClient のシングルトンインスタンスを生成・エクスポート
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 開発環境の場合はグローバル変数にインスタンスを保存し再利用
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
