// 環境変数を読み込むために dotenv をインポート
import 'dotenv/config';
// Prisma 設定関数をインポート
import { defineConfig } from '@prisma/config';

// Prisma 7 用の設定オブジェクトを定義してエクスポート
export default defineConfig({
  // データソースの接続 URL を設定
  datasource: {
    // DIRECT_URL が無ければ DATABASE_URL を利用
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
