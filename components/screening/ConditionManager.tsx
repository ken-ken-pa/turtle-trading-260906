'use client';

import { useState, useEffect } from 'react';
import type { FilterCriteria } from '@/lib/screening/types';
import { MAX_SAVED_CONDITIONS } from './constants';
import type { MarketCategory } from '@prisma/client';

interface SavedCondition {
  id: string;
  name: string;
  category: MarketCategory;
  filters: FilterCriteria;
  minTradeCount: number;
}

interface Props {
  currentCategory: MarketCategory;
  currentFilters: FilterCriteria;
  currentMinTradeCount: number;
  onLoad: (condition: SavedCondition) => void;
  onConditionIdChange: (id: string | undefined) => void;
}

/******************************************************************
 名前付き絞り込み条件の管理コンポーネント（A4: 最大10件）
 前回条件を記憶する仕様のため、選択中の条件は自動的にconditionIdとして
 親コンポーネントへ伝播し、トリガー実行時のリクエストに含める。
 ******************************************************************/
export default function ConditionManager({
  currentCategory,
  currentFilters,
  currentMinTradeCount,
  onLoad,
  onConditionIdChange,
}: Props) {
  const [conditions, setConditions] = useState<SavedCondition[]>([]);
  const [saveName, setSaveName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConditions = async () => {
    const res = await fetch('/api/screening/conditions');
    const data = await res.json();
    setConditions(data.conditions || []);
  };

  useEffect(() => {
    fetchConditions();
  }, []);

  const handleSave = async () => {
    if (!saveName.trim()) {
      setError('条件名を入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/screening/conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          category: currentCategory,
          filters: currentFilters,
          minTradeCount: currentMinTradeCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '保存に失敗しました');
        return;
      }
      setSaveName('');
      await fetchConditions();
      onConditionIdChange(data.condition.id);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/screening/conditions/${id}`, { method: 'DELETE' });
    await fetchConditions();
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">保存済み条件</h3>
        <span className="text-xs text-gray-500">
          {conditions.length} / {MAX_SAVED_CONDITIONS}件
        </span>
      </div>

      {conditions.length > 0 && (
        <ul className="space-y-1.5">
          {conditions.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 bg-gray-800 rounded-md px-3 py-2"
            >
              <button
                type="button"
                onClick={() => {
                  onLoad(c);
                  onConditionIdChange(c.id);
                }}
                className="text-sm text-gray-100 hover:text-blue-400 text-left flex-1"
              >
                {c.name}
                <span className="text-xs text-gray-500 ml-2">({c.category})</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-400 hover:text-red-300 shrink-0"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="条件名を入力して保存"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md"
        >
          現在の条件を保存
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {conditions.length >= MAX_SAVED_CONDITIONS && (
        <p className="text-xs text-amber-500">
          上限に達しています。新しい条件を保存するには、いずれかを削除してください。
        </p>
      )}
    </div>
  );
}
