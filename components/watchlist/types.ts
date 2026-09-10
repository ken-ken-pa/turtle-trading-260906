// 最新シグナル1件分の型定義
export interface SignalItem {
  id: string;
  type: string; // 'LONG_ENTRY' | 'EXIT_LONG'
  price: number;
  date: string; // ISO文字列
  source: string; // 'MANUAL' | 'AUTO_DAILY'
}

// ウォッチリスト1行分の型定義（APIレスポンス由来）
export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string | null;
  sortOrder: number;
  dashboardSelected: boolean;
  profitCount: number | null;
  profitTotalProfit: number | null;
  profitAvgProfit: number | null;
  profitWins: number | null;
  profitLosses: number | null;
  profitDraws: number | null;
  profitWinRate: number | null;
  profitCalculatedAt: string | null;
  // 「最新シグナル取得」をクリックした取引日(JST 9:00〜翌8:59区切り)に発生したシグナルのみが入る。
  // その日に発生していなければnull（空欄表示）
  latestSignalType: string | null;
  latestSignalDate: string | null;
  latestSignalPrice: number | null;
  // 実際の保有ポジション情報（ユーザー手動入力。バッチ処理・クリアボタンでは上書き・消去しない）
  acquisitionPrice: number | null; // 取得単価（整数）
  acquisitionShares: number | null; // 保有株数（整数）
  acquisitionDate: string | null; // 取得日（ISO日付文字列）
  // 保有損益（自動計算。取得単価・保有株数が揃っている場合のみ、バッチ処理実行時に再計算される）
  unitProfit: number | null; // 単価損益 = 直近終値 - 取得単価
  totalProfit: number | null; // 損益合計 = 単価損益 × 保有株数
}

// 列ソート対象キー（未指定=ソートなし＝手動並べ替えのベース順で表示）
export type SortKey =
  | 'symbol'
  | 'name'
  | 'selected'
  | 'signalType'
  | 'signalDate'
  | 'signalPrice'
  | 'profitCount'
  | 'profitWinRate'
  | 'profitAvgProfit'
  | 'profitTotalProfit'
  | 'acquisitionPrice'
  | 'acquisitionShares'
  | 'acquisitionDate'
  | 'unitProfit'
  | 'totalProfit'
  | null;

// ソート方向。降順→昇順→ソートなしの順で循環させる仕様のためdescを起点とする
export type SortDirection = 'desc' | 'asc';

// 複数列ソート1件分の型定義（優先順位は配列内の並び順で表現する。先頭が第1優先）
export interface SortKeyEntry {
  key: Exclude<SortKey, null>;
  direction: SortDirection;
}

// バッチジョブ（最新シグナル取得 / Long Profit集計取得）の型定義
export interface BatchJob {
  id: string;
  type: 'SIGNAL_FETCH' | 'PROFIT_AGGREGATION';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalCount: number;
  processedCount: number;
  errorCount: number;
}

// ユーザー設定（ウォッチリストが管理する共通設定＋自動再取得設定）
export interface UserSettingData {
  entryDays: number;
  exitDays: number;
  atrDays: number;
  interval: string; // '1d' | '1wk' | '1mo'
  aggregationPeriod: string; // '1mo' | '3mo' | '6mo' | '1y' | '3y' | 'max'
  splitCount: number;
  period: string;
  autoRefreshTime: string | null; // "HH:mm"
  lastAutoRefreshDate: string | null;
  // ウォッチリストの列ソート状態（複数列対応。DBに永続化。別端末・再ログインでも維持される）
  // 配列の先頭が第1優先。空配列は「ソートなし」＝手動並べ替えのベース順で表示
  watchlistSortKeys: SortKeyEntry[];
}

// ウォッチリスト履歴のスナップショット内、銘柄1件分の型定義
export interface WatchlistHistorySnapshotItem {
  symbol: string;
  name: string | null;
  sortOrder: number;
  dashboardSelected: boolean;
  profitCount: number | null;
  profitTotalProfit: number | null;
  profitAvgProfit: number | null;
  profitWins: number | null;
  profitLosses: number | null;
  profitDraws: number | null;
  profitWinRate: number | null;
  latestSignalType: string | null;
  latestSignalDate: string | null;
  latestSignalPrice: number | null;
  // 保有ポジション情報（参考表示のみ。復元対象には含めない）
  acquisitionPrice: number | null;
  acquisitionShares: number | null;
  acquisitionDate: string | null;
  unitProfit: number | null;
  totalProfit: number | null;
}

// ウォッチリスト履歴1件分の型定義
export interface WatchlistHistory {
  id: string;
  memo: string;
  interval: string;
  entryDays: number;
  exitDays: number;
  atrDays: number;
  aggregationPeriod: string;
  items: WatchlistHistorySnapshotItem[];
  created_at: string;
}
