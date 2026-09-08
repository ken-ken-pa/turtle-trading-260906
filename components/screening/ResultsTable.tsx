'use client';

import { useState, useMemo } from 'react';
import type { ScreeningResultItem, SkippedSymbol } from '@/lib/screening/types';

interface Props {
  results: ScreeningResultItem[];
  skippedSymbols: SkippedSymbol[];
  designatedSymbols: string[]; // 4桁コード
}

type SortKey = 'rank' | 'symbol' | 'totalProfit' | 'winRate' | 'averageProfit' | 'tradeCount' | null;
type SortDirection = 'asc' | 'desc';

/******************************************************************
 スクリーニング結果テーブル
 - トップ20は順位順、指定銘柄（圏外）はその後ろに表示（初期状態、ソート解除時）
 - 列見出しクリックで並び替え可能（ウォッチリストと同じ「昇順→降順→解除」の3段階トグル）
 - トップ20と指定銘柄が重複する銘柄には「重複」バッジを表示
 - 指定銘柄がデータ取得失敗でスキップされていた場合はその行に表示（L2案b）
 ******************************************************************/
export default function ResultsTable({ results, skippedSymbols, designatedSymbols }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const skippedSymbolSet = new Set(skippedSymbols.map((s) => s.symbol));

  // 列見出しクリック時の並び替え切り替え処理（同じ列の連続クリックで 昇順→降順→解除 を循環）
  const handleSortClick = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('asc');
      return;
    }
    if (sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }
    setSortKey(null);
    setSortDirection('asc');
  };

  const renderSortArrow = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const sortedResults = useMemo(() => {
    if (!sortKey) return results;

    const dir = sortDirection === 'asc' ? 1 : -1;
    const withFallback = (v: number | null, fallback: number) => (v === null ? fallback : v);

    return [...results].sort((a, b) => {
      switch (sortKey) {
        case 'rank':
          return dir * (withFallback(a.rank, 9999) - withFallback(b.rank, 9999));
        case 'symbol':
          return dir * a.symbol.localeCompare(b.symbol);
        case 'totalProfit':
          return dir * (a.totalProfit - b.totalProfit);
        case 'winRate':
          return dir * (withFallback(a.winRate, -1) - withFallback(b.winRate, -1));
        case 'averageProfit':
          return dir * (a.averageProfit - b.averageProfit);
        case 'tradeCount':
          return dir * (a.tradeCount - b.tradeCount);
        default:
          return 0;
      }
    });
  }, [results, sortKey, sortDirection]);

  const thBase = 'py-2 pr-3 cursor-pointer select-none hover:text-gray-200 transition-colors';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
            <th className={thBase} onClick={() => handleSortClick('rank')}>
              順位{renderSortArrow('rank')}
            </th>
            <th className={thBase} onClick={() => handleSortClick('symbol')}>
              銘柄{renderSortArrow('symbol')}
            </th>
            <th className={`${thBase} text-right`} onClick={() => handleSortClick('totalProfit')}>
              合計Long Profit{renderSortArrow('totalProfit')}
            </th>
            <th className={`${thBase} text-right`} onClick={() => handleSortClick('winRate')}>
              勝率{renderSortArrow('winRate')}
            </th>
            <th className={`${thBase} text-right`} onClick={() => handleSortClick('averageProfit')}>
              平均Long Profit{renderSortArrow('averageProfit')}
            </th>
            <th className={`${thBase} text-right`} onClick={() => handleSortClick('tradeCount')}>
              発生回数{renderSortArrow('tradeCount')}
            </th>
            <th className="py-2 pr-3">区分</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((r) => (
            <tr key={r.symbol} className="border-b border-gray-900 hover:bg-gray-900/50">
              <td className="py-2 pr-3 text-gray-400">{r.rank ?? '-'}</td>
              <td className="py-2 pr-3 text-gray-100">
                {r.name}
                <span className="text-gray-500 ml-1.5">{r.symbol}</span>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {r.totalProfit.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {r.winRate !== null ? `${(r.winRate * 100).toFixed(1)}%` : '-'}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {r.averageProfit.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.tradeCount}</td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-1">
                  {r.isTop20 && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 text-[10px]">
                      トップ20
                    </span>
                  )}
                  {r.isDesignated && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 text-[10px]">
                      指定銘柄
                    </span>
                  )}
                  {r.isDesignated && r.isTop20 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 text-[10px]">
                      重複
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {/* 指定銘柄のうち、データ取得失敗でスキップされ結果に含まれなかったもの */}
          {designatedSymbols
            .filter((sym) => skippedSymbolSet.has(sym) && !results.some((r) => r.symbol === sym))
            .map((sym) => {
              const skip = skippedSymbols.find((s) => s.symbol === sym);
              return (
                <tr key={`skipped-${sym}`} className="border-b border-gray-900 opacity-60">
                  <td className="py-2 pr-3 text-gray-600">-</td>
                  <td className="py-2 pr-3 text-gray-400">{sym}</td>
                  <td className="py-2 pr-3 text-right text-gray-600">-</td>
                  <td className="py-2 pr-3 text-right text-gray-600">-</td>
                  <td className="py-2 pr-3 text-right text-gray-600">-</td>
                  <td className="py-2 pr-3 text-right text-gray-600">-</td>
                  <td className="py-2 pr-3">
                    <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-[10px]">
                      指定銘柄・データ取得失敗{skip ? `（${skip.reason}）` : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
