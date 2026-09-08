'use client';

import { useEffect, useState } from 'react';
import { WatchlistHistory } from './types';

interface HistoryModalProps {
  onClose: () => void;
  onRestored: () => void;
}

const INTERVAL_LABEL: Record<string, string> = { '1d': '日足', '1wk': '週足', '1mo': '月足' };

export default function HistoryModal({ onClose, onRestored }: HistoryModalProps) {
  const [histories, setHistories] = useState<WatchlistHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/watchlist/history');
    const data = await res.json();
    setHistories(data.histories ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async (id: string) => {
    if (!confirm('この履歴の並び順・選択状態・設定を現在のウォッチリストに反映します。よろしいですか？\n(Long Profit集計値・シグナル状態は反映されません)')) return;
    setRestoringId(id);
    try {
      const res = await fetch(`/api/watchlist/history/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        onRestored();
        onClose();
      } else {
        alert('復元に失敗しました');
      }
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この履歴を削除します。よろしいですか？')) return;
    await fetch(`/api/watchlist/history/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">ウォッチリスト履歴(最大10件)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
        {!loading && histories.length === 0 && (
          <p className="text-sm text-gray-500">保存された履歴はありません。</p>
        )}

        <div className="space-y-3">
          {histories.map((h) => (
            <div key={h.id} className="border border-gray-800 rounded-lg p-3 bg-gray-950/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{h.memo}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(h.created_at).toLocaleString('ja-JP')}／
                    {INTERVAL_LABEL[h.interval] ?? h.interval}／entry{h.entryDays}/exit{h.exitDays}/ATR{h.atrDays}／
                    集計期間{h.aggregationPeriod}／{h.items.length}銘柄
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(h.id)}
                    disabled={restoringId === h.id}
                    className="text-xs bg-blue-600 hover:bg-blue-500 rounded px-3 py-1.5 disabled:opacity-50"
                  >
                    {restoringId === h.id ? '復元中...' : '復元'}
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-3 py-1.5"
                  >
                    削除
                  </button>
                </div>
              </div>

              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  当時のLong Profit集計値・シグナル状態を見る(参考表示)
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs">
                  <table className="w-full">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="text-left py-1">銘柄</th>
                        <th className="text-left py-1">最新シグナル</th>
                        <th className="text-left py-1">件数</th>
                        <th className="text-left py-1">勝率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.items.map((item) => (
                        <tr key={item.symbol} className="text-gray-400">
                          <td className="py-0.5">
                            {item.symbol} {item.name}
                          </td>
                          {/* 履歴内のシグナルは「非最新」であることを示すためグレー表示にしている */}
                          <td className="py-0.5 text-gray-500">
                            {item.latestSignalType
                              ? `${item.latestSignalType === 'LONG_ENTRY' ? 'Long Entry' : 'Exit Long'} (${item.latestSignalDate?.toString().split('T')[0]})`
                              : '-'}
                          </td>
                          <td className="py-0.5">{item.profitCount ?? '-'}</td>
                          <td className="py-0.5">
                            {item.profitWinRate != null ? `${Math.round(item.profitWinRate * 100)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
