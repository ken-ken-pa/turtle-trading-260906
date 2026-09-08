# 🐢 Turtle Trading System 引き継ぎ書

最終更新日: 2026-08-18
対象リポジトリ: `turtle-trading-260902`

---

## 1. システム概要

タートル・トレーディング戦略（20日高値ブレイクでエントリー／10日安値割れまたは2ATR損切りで手仕舞い）に基づき、日本株のローソク足チャート上にエントリー・手仕舞いシグナルを自動描画する、マルチチャート監視・分析Webシステムです。

- ログイン中のユーザーが最大16分割の画面で、任意の銘柄コードを指定してチャートを同時比較できる
- 表示期間（1か月〜最長）、足種別（日足・週足・月足）を切り替え可能
- ウォッチリストに銘柄を登録し、平日朝に自動でシグナル検知・メール通知（Cronバッチ）を行う仕組みを持つ
- Google認証 / メール・パスワード認証（NextAuth）でユーザーごとにログインする、マルチユーザー対応システム

### 主な戦略ロジック（Pine Script移植）
`app/api/stock/route.ts` の `calculatePineTurtle2ATR()` にて以下を計算しています。

| 項目 | 内容 |
|---|---|
| エントリー期間 | 20日高値ブレイクで Long Entry |
| 手仕舞い期間 | 10日安値割れで Exit Long |
| ストップロス | 2 × ATR(20) を割り込んだら Exit Long（損切り） |
| 描画ライン | 20日高値/安値ライン（青太線）、トレンドライン（黄太線）、10日手仕舞いライン（水色点線）、2ATRストップライン（黄点線） |

---

## 2. 技術スタック

| 分類 | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js（App Router） | 16.3.0 |
| UI | React | 19.2.8 |
| 言語 | TypeScript | 5.9.3 |
| スタイリング | Tailwind CSS | v4 |
| チャート描画 | lightweight-charts | 4.2.2 |
| ORM | Prisma（Driver Adapter方式） | 7.9.1 |
| DB接続 | @prisma/adapter-pg + pg（PostgreSQL） | - |
| 認証 | next-auth（JWTセッション） + @auth/prisma-adapter | 4.24.15 |
| パスワードハッシュ | bcryptjs | 3.0.2 |
| 株価データ取得 | yahoo-finance2（Yahoo Finance非公式API） | 4.0.2 |
| メール送信 | resend | 4.1.2 |
| デプロイ想定 | Vercel（vercel.json に Cron設定あり） | - |

---

## 3. ディレクトリ構成と役割

```
turtle-trading-260902/
├─ app/
│  ├─ page.tsx                      … "/" アクセス時に /dashboard へ即リダイレクト
│  ├─ layout.tsx                    … ルートレイアウト。NextAuthProviderで全体をラップ
│  ├─ globals.css                   … Tailwindグローバルスタイル
│  ├─ login/page.tsx                … ログイン画面（Credentials / Google）
│  ├─ register/page.tsx             … 新規会員登録画面
│  ├─ dashboard/page.tsx            … ★メイン画面。画面分割数/期間/足種別の状態管理とDB連携
│  ├─ watchlist/page.tsx            … ウォッチリスト管理画面
│  └─ api/
│     ├─ auth/[...nextauth]/route.ts  … NextAuth設定（Credentials認証＋Google認証）
│     ├─ register/route.ts            … 会員登録API（bcryptでパスワードハッシュ化）
│     ├─ stock/route.ts               … ★株価取得＋タートル戦略シグナル計算API（Yahoo Finance）
│     ├─ symbol-lookup/route.ts       … 銘柄コード/企業名オートコンプリートAPI（Yahoo Finance検索）
│     ├─ user/settings/route.ts       … ★ユーザーごとの画面表示設定 取得(GET)/保存(POST) API
│     ├─ watchlist/route.ts           … ウォッチリストCRUD API（2026-08-20 既知バグ修正済み、11章参照）
│     └─ cron/check-signals/route.ts  … ★平日朝に走るシグナル検知・メール通知バッチ（2026-08-20 実装完了、13章参照）
├─ components/
│  ├─ Navbar.tsx                    … 共通ヘッダー（ログイン中ユーザー表示・ログアウト）
│  ├─ providers/NextAuthProvider.tsx… next-auth の SessionProvider ラッパー
│  └─ dashboard/
│     └─ TurtleChart.tsx            … ★個別チャート描画コンポーネント（本体・実際に使用中）
├─ lib/
│  ├─ prisma.ts                     … PrismaClientシングルトン（pg Pool + driver adapter方式）
│  └─ turtleStrategy.ts             … ★タートル戦略の計算ロジック共通モジュール（/api/stockと/api/cronで共用、2026-08-20追加）
├─ prisma/
│  ├─ schema.prisma                 … ★DBスキーマ定義
│  └─ migrations/                   … マイグレーション履歴（初期構築→2026-08-17マルチユーザー化）
├─ middleware.ts                    … /dashboard, /watchlist を認証必須にするミドルウェア
├─ prisma.config.ts                 … Prisma 7用のDB接続設定（DIRECT_URL優先）
├─ vercel.json                      … Vercel Cron設定（平日7:30 UTC相当に check-signals を実行）
├─ .env / .env.local                … 環境変数（本引き継ぎではキー値は空欄で共有）
└─ README.md                        … クイックスタート手順
```

★ = 今回の改善対象に直接関わる主要ファイル

---

## 4. データベース設計（`prisma/schema.prisma`）

| モデル | 役割 |
|---|---|
| `User` | ユーザー基本情報。メール認証用の`password`（bcryptハッシュ）とOAuth用フィールドを両方保持 |
| `Account` / `Session` / `VerificationToken` | next-auth標準テーブル（PrismaAdapter用） |
| `UserSetting` | **ユーザー単位のチャート表示設定を保持する1:1テーブル**。`entryDays`/`exitDays`/`atrDays`（戦略パラメータ、現状UI未接続）、`notifyByEmail`、`screenCount`（画面分割数）、`period`（表示期間）、`interval`（足種別）、`symbols`（銘柄コード配列）を保持 |
| `Watchlist` | ユーザーごとの監視銘柄一覧。`@@unique([userId, symbol])`で1ユーザー内の重複登録を防止 |
| `SignalHistory` | Watchlist銘柄に対するシグナル検知履歴（Cronバッチが書き込む） |

2026-08-17のマイグレーション（`20260817082217_sync_schema`）で、単一ユーザー運用だったスキーマをマルチユーザー対応（NextAuthテーブル追加、`UserSetting`に`screenCount`/`period`/`interval`/`symbols`列を追加）へ移行しています。この際に一部API（`watchlist/route.ts`）の実装がスキーマ変更に追従できていませんでしたが、2026-08-20に修正済みです（11章参照）。

---

## 5. 画面・機能一覧

| 画面 | パス | 概要 |
|---|---|---|
| ログイン | `/login` | メール・パスワード認証、Google認証 |
| 会員登録 | `/register` | 新規アカウント作成（パスワードはbcryptでハッシュ化してDB保存） |
| ダッシュボード | `/dashboard` | メイン画面。1〜16分割のチャートを表示し、画面数/期間/足種別をユーザー単位でDBに自動保存・復元 |
| ウォッチリスト管理 | `/watchlist` | 監視銘柄の追加・削除 |

### ダッシュボード画面の操作要素（画像添付の実際の画面に対応）
- 画面分割数切り替え: `1 / 2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 画面`
- 表示期間切り替え: `1か月 / 3か月 / 6か月 / 1年 / 3年 / 最長`
- 足種別切り替え: `日足 / 週足 / 月足`
- 各チャート個別: 銘柄コード/企業名入力欄＋サジェスト＋「検索」ボタン、企業名バッジ表示

---

## 6. 現状すでに実装済みのユーザー設定永続化の仕組み

`app/dashboard/page.tsx` は、マウント時に `GET /api/user/settings` を呼び出し、DBに保存された `screenCount` / `period` / `interval` を読み込んで画面に復元し、以降これらの値が変更されるたびに500msデバウンスで `POST /api/user/settings` に自動保存しています（`UserSetting` テーブルへupsert）。

つまり **「画面分割数」「表示期間」「足種別」は、既にユーザー単位でDBに記憶され、次回ログイン時に自動復元される状態です。**

一方で、`UserSetting.symbols` フィールドとAPIの入出力自体は存在するものの、**フロントエンド側（`dashboard/page.tsx` と `TurtleChart.tsx`）はこの`symbols`を一切読み書きしていません。** 各チャートの銘柄コードは `TurtleChart` コンポーネント内部の `useState` にのみ保持されており、ページを開くたびに全チャートがデフォルト値 `8035.T` にリセットされます。

---

## 7. 今回のご依頼内容（機能追加）

> 1画面・2画面等の画面数、期間、日足・週足・月足、各チャートの検索欄に入力した証券コードを、ユーザー単位で記憶し、次回起動時に同じ設定で開けるようにしたい。

上記6章の通り、画面数・期間・足種別は実装済みのため、**残る作業は「各チャート（インデックスごと）の銘柄コードをユーザー単位で永続化する」対応**になります。具体的な改修方針は次回作業として以下を予定しています。

1. `TurtleChart.tsx` を銘柄コードに関して「制御コンポーネント」化し、`currentSymbol` を親から受け取り、変更時は親へ`onSymbolChange`等で通知する形に変更
2. `dashboard/page.tsx` にてチャート数分の `symbols: string[]` ステートを保持し、`UserSetting.symbols` のロード/自動保存ロジック（既存の screenCount/period/interval と同様のuseEffect）に組み込む
3. 画面数を変更して表示チャート数が増えた場合のデフォルト銘柄補完（`symbols`配列が不足するケースのフォールバック値）を設計
4. `POST /api/user/settings` への保存ペイロードに `symbols` を追加（API自体は対応済みのため変更不要な想定）

---

## 8. 既知の不具合・技術的負債（申し送り事項）

以下は過去に申し送りしていた項目です。いずれも2026-08-20に対応済みです（13章参照）。

| 箇所 | 内容 |
|---|---|
| `components/dashboard/TradingDashboard.tsx` | どこからも参照されていない未使用コンポーネントでした → 削除済み |
| `app/api/cron/check-signals/route.ts` | シグナル検知ロジックが固定値のダミー実装でした → 実装済み |
| `UserSetting.entryDays / exitDays / atrDays` | フロント・APIとも未接続でした → 接続済み（画面右上「⚙ 戦略設定」から変更可能） |
| `app/api/watchlist/route.ts` | 複合ユニークキー不整合・認証未チェック | 2026-08-20修正済み（11章参照） |

現時点で本書に記載している未解決の既知課題はありません。新たに発見した場合は本章に追記してください。

---

## 9. 環境構築手順（ゼロから）

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数設定（.env を作成）
DATABASE_URL="postgres://..."       # Prisma Postgres プールド接続
DIRECT_URL="postgres://..."         # マイグレーション用ダイレクト接続
RESEND_API_KEY="re_..."             # メール通知用
CRON_SECRET="任意のランダム文字列"   # Cronエンドポイント保護用
NEXTAUTH_SECRET="任意のランダム文字列"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."              # Google認証を使う場合
GOOGLE_CLIENT_SECRET="..."

# 3. DBスキーマ反映
npx prisma db push
# もしくはマイグレーション履歴を適用する場合
npx prisma migrate deploy

# 4. 開発サーバー起動
npm run dev
```

http://localhost:3000 へアクセスすると `/dashboard` へリダイレクトされます（未ログイン時は`/login`へ）。

### Vercelデプロイ時の注意
- `vercel.json` により `/api/cron/check-signals` が平日 `30 7 * * 1-5`（UTC、日本時間16:30）に自動実行されるCron設定が入っています
- Cronエンドポイントは `Authorization: Bearer ${CRON_SECRET}` ヘッダーで保護されているため、Vercel環境変数に`CRON_SECRET`の設定が必須です

---

## 11. 改修履歴（2026-08-20 追加分）

前回引き継ぎ時点の課題（6章・7章）を踏まえ、以下3点を修正しました。

| # | 修正内容 | 対応ファイル |
|---|---|---|
| ① | 証券コード入力時に企業名が表示されない問題を修正。`/api/stock`にYahoo Financeの`quote()`呼び出しを追加し`companyName`をレスポンスに含めるようにした。また候補表示を`STOCK_MASTER`（約30銘柄の固定リスト）のみに依存していた状態から、`/api/symbol-lookup`（Yahoo Finance検索API）へのデバウンス問い合わせを追加し、任意の証券コード・企業名でも候補が出るようにした（東証銘柄＝`.T`サフィックスのみに絞り込み） | `app/api/stock/route.ts`, `components/dashboard/TurtleChart.tsx` |
| ② | 存在しない証券コードを入力した際に`throw new Error`→`console.error`経由でNext.js開発オーバーレイ（Console Error画面）が表示されてしまう問題を修正。APIのエラーレスポンスをステータスコードで判定しつつ`console.error`を呼ばずに画面内(企業名バッジ)へ赤色でエラーメッセージを表示するよう変更。あわせて`/api/stock`側も、無効な証券コードによる失敗は`console.warn`＋404（分かりやすい日本語メッセージ）で返すようにし、本当に想定外のサーバーエラーのみ`console.error`＋500を返すよう整理 | 同上 |
| ③ | 検索欄・候補表示・企業名バッジ表示のすべてから末尾の`.T`表記を除去（`stripSuffix()`関数を追加）。内部的なYahoo Finance問い合わせ用の銘柄コード（`currentSymbol`）は引き続き`.T`付きで保持し、DB保存用の`onSymbolChange`通知にも`.T`付きの値を渡すことで、既存の`UserSetting.symbols`との互換性を維持 | `components/dashboard/TurtleChart.tsx` |

### 動作確認済み事項
- 編集ファイルはTypeScriptの型チェック（`tsc --noEmit`）でエラーなしを確認（既知の`watchlist/route.ts`のエラーは今回の変更と無関係、8章参照）

### 今後の確認事項（次回作業者への申し送り）
- `/api/symbol-lookup`はYahoo Financeの検索APIをそのまま利用しているため、稀にレート制限や一時的な検索結果ゼロ件が発生し得る。候補が出ない場合でも「検索」ボタン押下で直接コード検索は可能（フォールバック動作として問題なし）
- 企業名バッジのエラー表示は、無効コードの場合に「⚠ 銘柄が見つかりません」を表示するのみで、直前まで表示されていたチャート（別銘柄の残存データ）は自動クリアしていない。UI上の見え方として気になる場合は、エラー時にチャートシリーズを明示的に空データへリセットする対応を追加で検討

## 12. `app/api/watchlist/route.ts` の既知バグ修正（2026-08-20）

8章で申し送りしていた不整合を修正しました。

- **複合ユニークキーの不一致を修正**: `Watchlist` モデルの一意制約は `@@unique([userId, symbol])` であるにもかかわらず、POST（upsert）・DELETEの`where`句が`symbol`単体で組まれていた。Prismaが生成する複合キー名`userId_symbol`を使った`where: { userId_symbol: { userId, symbol } }`の形に修正
- **POSTの`create`に`userId`が欠落していた問題を修正**: `userId`（必須フィールド）を渡すよう追加
- **認証チェックが存在しなかった問題を修正**: GET/POST/DELETEいずれも`getServerSession(authOptions)`によるログインチェックを追加し、ログイン中ユーザー自身のウォッチリストのみを操作対象とするよう変更。従来はデータベース内の全ユーザーの銘柄が区別なく返却・操作可能な状態でした
  - 補足: `middleware.ts`の保護対象パス（`matcher`）は`/watchlist/:path*`（画面ページ）のみで、`/api/watchlist`（APIルート）はパスパターンが異なるため対象外でした。そのため今回API側に直接認証チェックを追加したことで、未ログイン状態でのAPI呼び出しも防げるようになっています

修正後、`tsc --noEmit`で本APIの型エラーが解消されたことを確認済みです（画面側`app/watchlist/page.tsx`のリクエスト/レスポンス形式は変更していないため、フロントエンドの改修は不要でした）。

---

## 13. 残課題3件の対応（2026-08-20）

8章で申し送りしていた残り3件の技術的負債を解消しました。

### ① `components/dashboard/TradingDashboard.tsx` の削除

どこからも参照されていない未使用コンポーネントであることを`grep`で再確認したうえで削除しました。現在ダッシュボード画面の実体は`app/dashboard/page.tsx` + `components/dashboard/TurtleChart.tsx`のみです。

### ② `app/api/cron/check-signals/route.ts` の実装

固定値（`signalDetected = true`、価格`45820`）のダミー実装を、実際のシグナル判定ロジックに置き換えました。

- **計算ロジックの共通化**: `/api/stock/route.ts`に個別実装されていた`calculatePineTurtle2ATR()`関数を`lib/turtleStrategy.ts`へ切り出し、`/api/stock`と`/api/cron/check-signals`の両方から共通利用する形にしました（計算式の二重管理・乖離を防止）
- **Cronバッチの新しい処理内容**:
  1. メール通知が有効な全ユーザーのウォッチリスト銘柄を取得
  2. 各銘柄についてYahoo Financeから過去2年分の日足データを取得
  3. ユーザーごとの戦略パラメータ（`entryDays`/`exitDays`/`atrDays`、後述③参照）で`calculatePineTurtle2ATR()`を実行
  4. 直近の取引日に新しいシグナル（Long Entry / Exit Long）が発生していれば、`SignalHistory`に同一銘柄・同一種別・同一日付の記録が無いことを確認したうえで登録し、メール通知を送信（重複通知防止のガードを追加）
  5. 個別銘柄の取得失敗はバッチ全体を止めず、ログのみ出力して次の銘柄へ継続する設計に変更

### ③ `UserSetting.entryDays / exitDays / atrDays` のフロント・API接続

- `app/api/user/settings/route.ts`（GET/POST）が`entryDays`/`exitDays`/`atrDays`を読み書きできるよう対応（値は2〜200の範囲にサーバー側でクランプ）
- `app/api/stock/route.ts`がクエリパラメータ`entryDays`/`exitDays`/`atrDays`を受け取り、`calculatePineTurtle2ATR()`に渡すよう変更（未指定時は従来通り20/10/20のデフォルト値で動作するため後方互換性あり）
- `app/dashboard/page.tsx`の操作コントロールバーに「⚙ 戦略設定」ボタンとパラメータ入力パネル（エントリー期間・手仕舞い期間・ATR期間の3項目、デフォルト値に戻すボタン付き）を追加し、`screenCount`/`period`/`interval`/`symbols`と同様にユーザー単位でDBへ自動保存・復元されるようにしました
- `components/dashboard/TurtleChart.tsx`が`entryDays`/`exitDays`/`atrDays`をpropsとして受け取り、`/api/stock`へのリクエストに反映するよう変更

### 動作確認済み事項

- 変更後、プロジェクト全体で`tsc --noEmit`を実行しエラーゼロを確認
- `app/api/watchlist/route.ts`側のリクエスト/レスポンス形式・`app/watchlist/page.tsx`など、上記3件と無関係な画面・APIには変更を加えていません

### 今後の確認事項（次回作業者への申し送り）

- 戦略パラメータ（エントリー/手仕舞い/ATR期間）を大きな値（100日超など）に設定した場合、`/api/stock`側の期間別データ取得マージン（例: 「1か月」表示時は3か月分のみ取得）では計算に必要な過去データが不足し、チャート序盤の期間でラインやシグナルが表示されないことがあります。運用上問題になる場合は、取得マージンをパラメータに応じて動的に広げる対応を追加検討してください
- Cronバッチは「直近の取引日に新しいシグナルが発生しているか」で判定しているため、Cronの実行自体が長時間止まっていた場合（デプロイ停止等）、その間に発生したシグナルの一部は「直近の取引日」から外れて通知されずに終わる可能性があります。実運用開始前に、Cronの実行間隔と許容できる通知遅延について確認しておくことを推奨します

---

## 14. 機能追加4件（2026-08-20）

### ① ダッシュボードでのティッカーシンボル検索対応

これまでダッシュボードの銘柄検索は、候補の絞り込みを東証銘柄（`.T`サフィックス）のみに限定していたため、`AAPL`や`NVDA`のような海外ティッカーを検索しても候補が表示されませんでした。`components/dashboard/TurtleChart.tsx`のAPI検索候補の絞り込み条件（`.T`のみに限定するフィルタ）を削除し、`app/watchlist/page.tsx`と同じく`/api/symbol-lookup`の結果をそのまま候補として利用するよう変更しました。これにより、銘柄コード・企業名・海外ティッカーいずれで検索しても候補が表示され、選択すると検索欄に反映されるようになりました。

### ② ダッシュボードのチャート位置ドラッグ&ドロップ並び替え

各チャート左上の`⠿ #N`ラベルをドラッグハンドルとして、チャートの位置（表示銘柄）を並び替えられるようにしました。動作は「挿入」方式（ドラッグ元をドロップ先の位置へ移動し、間のチャートが1つずつ詰める）です。ドラッグ中はドロップ先候補のチャートに青いハイライト枠が表示されます。実装は`components/dashboard/TurtleChart.tsx`（ドラッグハンドルのUIと`onDragHandleStart`/`onDragHandleEnd`コールバック）と`app/dashboard/page.tsx`（ドロップ処理・状態管理）に追加しています。並び替え結果は既存の`symbols`配列の並び替えとして扱われるため、追加のDB変更なしにユーザー設定として自動保存・復元されます。

### ③ ウォッチリストの列見出しクリックによる並び替え

ウォッチリストの行を自由な順序でドラッグ並び替えする方式（DBへの「並び順」列追加が必要）は見送り、代わりに「銘柄コード」「銘柄名」の列見出しをクリックすると昇順・降順に並び替えられる方式を`app/watchlist/page.tsx`に実装しました。同じ列を再クリックすると昇順⇔降順がトグルします。この方式はDBスキーマ変更や新規APIが不要な、完全にフロントエンド側（`useMemo`によるクライアントサイドソート）のみの実装です。見出し未クリック時（初期状態）は従来通り登録日時の降順で表示されます。

### ④ ダッシュボードの銘柄コード表示から「.T」を再度表示

前回（13章以前）の対応で銘柄コード表示から`.T`サフィックスを非表示にしていましたが、今回の指示によりダッシュボードの検索欄・企業名バッジの表示を`.T`付きの実際の銘柄コードにそのまま戻しました（例: `8035` → `8035.T`）。半角4桁数字のみを入力した場合は引き続き東証銘柄の省略入力とみなし自動で`.T`を付与する挙動は維持しています（`8035`と入力しても`8035.T`として検索されます）。なお、候補ドロップダウン内の右側に表示される簡易コード表示（例: サジェスト行の右端）は視認性のため`.T`を含めない表記のまま据え置いています。

### 動作確認済み事項

- 変更後、プロジェクト全体で`tsc --noEmit`を実行しエラーゼロを確認
- ②③のドラッグ&ドロップ挙動は「挿入」方式（ドラッグ元とドロップ先の2要素のみを交換する「入れ替え」方式ではない）で実装しています

### 今後の確認事項（次回作業者への申し送り）

- ③のウォッチリスト並び替えは列見出しクリックによる動的ソートのみで、ユーザーが指定した独自の並び順を保存する機能ではありません（ページを開き直すと初期状態＝登録日時降順に戻ります）。任意順の並び替えを保存したい場合は、`Watchlist`モデルへの「並び順」列追加とマイグレーション適用が別途必要です
- ②のダッシュボードのチャート並び替えはブラウザの標準HTML5 Drag and Drop APIを使用しているため、タッチ操作のみのモバイル端末では動作しない可能性があります（マウス操作のデスクトップ環境での動作を前提としています）
