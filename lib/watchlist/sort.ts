// ウォッチリストの複数列ソート（優先順位付き）ロジック。
// ウォッチリスト画面自身の表示順、およびダッシュボードのチャート表示順の両方から
// 同じロジックを参照することで、両画面の並び順を完全に一致させる。

import { SortKeyEntry } from '@/components/watchlist/types';

// 列ヘッダー表示名（ソート解除確認ポップアップのメッセージなどに使用）。
// オブジェクトのキー順が、カード表示（md・sm）の簡易ソートバーの並び順、およびデスクトップ表の列順と一致するようにしている
export const SORT_LABELS: Record<SortKeyEntry['key'], string> = {
  selected: '表示',
  symbol: 'コード',
  name: '銘柄名',
  signalType: 'シグナル',
  signalDate: '発生日',
  signalPrice: '発生価格',
  profitCount: '件数',
  profitWinRate: '勝率',
  profitAvgProfit: '平均損益',
  profitTotalProfit: '合計損益',
  acquisitionPrice: '取得単価',
  acquisitionShares: '保有株数',
  acquisitionDate: '取得日',
  unitProfit: '単価損益',
  totalProfit: '損益合計',
};

// ソート対象の項目が最低限持つべきフィールド（WatchlistItem・API生データ(Watchlistレコード)の両方に対応）
interface SortableWatchlistFields {
  symbol: string;
  name?: string | null;
  dashboardSelected?: boolean;
  latestSignalType?: string | null;
  latestSignalDate?: string | Date | null;
  latestSignalPrice?: number | null;
  profitCount?: number | null;
  profitWinRate?: number | null;
  profitAvgProfit?: number | null;
  profitTotalProfit?: number | null;
  acquisitionPrice?: number | null;
  acquisitionShares?: number | null;
  acquisitionDate?: string | Date | null;
  unitProfit?: number | null;
  totalProfit?: number | null;
}

// 指定キーに対応するソート用の値を取り出す
export function getWatchlistSortValue(
  item: SortableWatchlistFields,
  key: SortKeyEntry['key']
): string | number {
  switch (key) {
    case 'symbol':
      return item.symbol;
    case 'name':
      return item.name ?? '';
    case 'selected':
      return item.dashboardSelected ? 1 : 0;
    case 'signalType':
      return item.latestSignalType ?? '';
    case 'signalDate':
      return item.latestSignalDate ? new Date(item.latestSignalDate).getTime() : -Infinity;
    case 'signalPrice':
      return item.latestSignalPrice ?? -Infinity;
    case 'profitCount':
      return item.profitCount ?? -Infinity;
    case 'profitWinRate':
      return item.profitWinRate ?? -Infinity;
    case 'profitAvgProfit':
      return item.profitAvgProfit ?? -Infinity;
    case 'profitTotalProfit':
      return item.profitTotalProfit ?? -Infinity;
    case 'acquisitionPrice':
      return item.acquisitionPrice ?? -Infinity;
    case 'acquisitionShares':
      return item.acquisitionShares ?? -Infinity;
    case 'acquisitionDate':
      return item.acquisitionDate ? new Date(item.acquisitionDate).getTime() : -Infinity;
    case 'unitProfit':
      return item.unitProfit ?? -Infinity;
    case 'totalProfit':
      return item.totalProfit ?? -Infinity;
    default:
      return '';
  }
}

// 複数列ソート（優先順位付き）を適用した新しい配列を返す。
// sortKeysが空配列の場合は「ソートなし」＝入力された並び順（＝手動並べ替えのベース順=sortOrder順）をそのまま維持する
export function applyWatchlistSort<T extends SortableWatchlistFields>(
  items: T[],
  sortKeys: SortKeyEntry[]
): T[] {
  if (sortKeys.length === 0) return items;
  return [...items].sort((a, b) => {
    // 配列の先頭（第1優先）から順に比較し、差が出た時点で確定する
    for (const { key, direction } of sortKeys) {
      const dir = direction === 'asc' ? 1 : -1;
      const va = getWatchlistSortValue(a, key);
      const vb = getWatchlistSortValue(b, key);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return 0;
  });
}
