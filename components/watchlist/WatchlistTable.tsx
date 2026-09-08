'use client';

import { useState } from 'react';
import { WatchlistItem, SortKey, SortDirection } from './types';

interface WatchlistTableProps {
  items: WatchlistItem[]; // 表示順（ソート適用済み or ベース順）に並んだ配列
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortClick: (key: Exclude<SortKey, null>) => void;
  onToggleSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void; // ドラッグ&ドロップ確定時、現在の並び順（全行分）を通知
}

const INTERVAL_SIGNAL_LABEL: Record<string, string> = {
  LONG_ENTRY: 'Long Entry',
  EXIT_LONG: 'Exit Long',
};

export default function WatchlistTable({
  items,
  sortKey,
  sortDirection,
  onSortClick,
  onToggleSelect,
  onDelete,
  onReorder,
}: WatchlistTableProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 列ヘッダークリックによるソートが有効な間は、手動並べ替え(ドラッグ&ドロップ)は無効にする
  // （「ソートなし」に戻すとベース順=手動並べ替え結果に戻る仕様のため、ソート中の並べ替えは意味を持たない）
  const dragEnabled = sortKey === null;

  const renderSortArrow = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) return null;
    return <span className="text-[10px] ml-1">{sortDirection === 'desc' ? '▼' : '▲'}</span>;
  };

  const HeaderButton = ({ label, k }: { label: string; k: Exclude<SortKey, null> }) => (
    <button
      type="button"
      onClick={() => onSortClick(k)}
      className="flex items-center hover:text-white transition"
    >
      {label}
      {renderSortArrow(k)}
    </button>
  );

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    onReorder(next.map((i) => i.id));
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/50 text-gray-400 text-xs">
              <th className="py-3 px-2 w-8"></th>
              <th className="py-3 px-2 font-semibold">
                <HeaderButton label="選択" k="selected" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="銘柄コード" k="symbol" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="銘柄名" k="name" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="最新シグナル" k="signalType" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="日付" k="signalDate" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="価格" k="signalPrice" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="件数" k="profitCount" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="勝率" k="profitWinRate" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="合計損益" k="profitTotalProfit" />
              </th>
              <th className="py-3 px-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const hasSignal = Boolean(item.latestSignalType);
              return (
                <tr
                  key={item.id}
                  draggable={dragEnabled}
                  onDragStart={(e) => {
                    if (!dragEnabled) return;
                    // Firefox等では dataTransfer.setData を呼ばないとドラッグ自体が開始されないため必須
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                    setDragIndex(index);
                  }}
                  onDragOver={(e) => {
                    if (!dragEnabled) return;
                    e.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDrop={() => dragEnabled && handleDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`border-b border-gray-800/60 hover:bg-gray-800/30 transition ${
                    dragOverIndex === index ? 'bg-blue-900/20' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-center text-gray-600">
                    {dragEnabled ? (
                      <span className="cursor-move select-none" title="ドラッグして並べ替え">
                        ⠿
                      </span>
                    ) : (
                      <span className="text-gray-800">⠿</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.dashboardSelected}
                      onChange={(e) => onToggleSelect(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="py-2 px-4 font-mono">{item.symbol}</td>
                  <td className="py-2 px-4">{item.name}</td>
                  <td className="py-2 px-4">
                    {hasSignal ? (
                      <span
                        className={
                          item.latestSignalType === 'LONG_ENTRY'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {INTERVAL_SIGNAL_LABEL[item.latestSignalType!] ?? item.latestSignalType}
                      </span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {hasSignal && item.latestSignalDate
                      ? new Date(item.latestSignalDate).toISOString().split('T')[0]
                      : '-'}
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {hasSignal && item.latestSignalPrice != null ? item.latestSignalPrice.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-4">{item.profitCount ?? '-'}</td>
                  <td className="py-2 px-4">
                    {item.profitWinRate != null ? `${Math.round(item.profitWinRate * 100)}%` : '-'}
                  </td>
                  <td className="py-2 px-4">
                    {item.profitTotalProfit != null ? item.profitTotalProfit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-600">
                  ウォッチリストは空です
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
