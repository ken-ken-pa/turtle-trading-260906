# 🐢 Turtle Trading System

Next.js 16 (App Router) + React 19 + Prisma 7 + Lightweight Charts で構築された、タートル・トレーディング戦略（20日高値更新エントリー / 10日安値手仕舞い / 2ATR損切りストップ）に基づくマルチチャート分析およびシグナル検知システムです。

---

## 📖 システム引き継ぎ書・詳細仕様

初見のユーザー・エンジニアがゼロから本システムを構築・保守運用するための詳細な引き継ぎ書は、以下を参照してください。

👉 **[システム構築・運用引き継ぎ書 (handover_document.md)](file:///C:/Users/Owners/.gemini/antigravity-ide/brain/b70c2c10-fe29-451e-a536-ff35ca3333c0/handover_document.md)**

### 引き継ぎ書の主な内容
- 全ディレクトリ・ファイル構成一覧
- インストールモジュール一覧（`package.json` 解析）
- Prisma 7 + PostgreSQL データベース設定（`schema.prisma`, `prisma.config.ts`, `lib/prisma.ts`）
- 環境変数設定（`.env.example`）
- 各種 API・コンポーネントの全ソースコード解説
- ゼロからのセットアップ & Vercel デプロイ・Cron 設定ガイド

---

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env` ファイルを作成し、データベースURL等を記述します。
```env
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."
RESEND_API_KEY="re_..."
CRON_SECRET="..."
```

### 3. データベースセットアップ
```bash
npx prisma db push
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスするとダッシュボードが表示されます。
