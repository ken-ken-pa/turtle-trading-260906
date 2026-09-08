'use client';

import { RANGE_FILTER_FIELDS, TEXT_FILTER_FIELDS } from './constants';
import type { FilterCriteria } from '@/lib/screening/types';

interface Props {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  minTradeCount: number;
  onMinTradeCountChange: (value: number) => void;
}

/******************************************************************
 絞り込み条件入力フォーム
 A4: 全項目任意（未入力＝条件なし）。数値項目はmin/maxのレンジ入力。
 ******************************************************************/
export default function FilterForm({
  filters,
  onChange,
  minTradeCount,
  onMinTradeCountChange,
}: Props) {
  const updateRange = (
    key: (typeof RANGE_FILTER_FIELDS)[number]['key'],
    edge: 'min' | 'max',
    raw: string
  ) => {
    const value = raw.trim() === '' ? undefined : Number(raw);
    onChange({
      ...filters,
      [key]: {
        ...(filters[key] || {}),
        [edge]: Number.isFinite(value as number) ? value : undefined,
      },
    });
  };

  const updateText = (
    key: (typeof TEXT_FILTER_FIELDS)[number]['key'],
    raw: string
  ) => {
    onChange({ ...filters, [key]: raw.trim() === '' ? undefined : raw });
  };

  const groups = Array.from(new Set(RANGE_FILTER_FIELDS.map((f) => f.group)));

  return (
    <div className="space-y-6">
      {/* テキスト一致項目（企業基本情報の一部） */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">企業基本情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TEXT_FILTER_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <input
                type="text"
                placeholder="未入力=条件なし"
                value={(filters[f.key] as string) ?? ''}
                onChange={(e) => updateText(f.key, e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* レンジ入力項目（グループごと） */}
      {groups.map((group) => (
        <div key={group}>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">{group}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RANGE_FILTER_FIELDS.filter((f) => f.group === group).map((f) => {
              const range = filters[f.key];
              return (
                <div key={f.key} className="bg-gray-900/50 border border-gray-800 rounded-md p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-300">{f.label}</span>
                    {f.hint && <span className="text-[10px] text-gray-500">{f.hint}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="下限"
                      value={range?.min ?? ''}
                      onChange={(e) => updateRange(f.key, 'min', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-gray-600 text-xs">〜</span>
                    <input
                      type="number"
                      placeholder="上限"
                      value={range?.max ?? ''}
                      onChange={(e) => updateRange(f.key, 'max', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* C3: 発生回数の最低閾値（初期値0=条件なし） */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Long Profit 発生回数の最低閾値</h3>
        <div className="flex items-center gap-2 max-w-xs">
          <input
            type="number"
            min={0}
            value={minTradeCount}
            onChange={(e) => onMinTradeCountChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-gray-500">回以上（0=条件なし）</span>
        </div>
      </div>
    </div>
  );
}
