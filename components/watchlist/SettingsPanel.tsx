'use client';

import { UserSettingData } from './types';

const INTERVAL_OPTIONS = [
  { value: '1d', label: '日足' },
  { value: '1wk', label: '週足' },
  { value: '1mo', label: '月足' },
];

const AGGREGATION_PERIOD_OPTIONS = [
  { value: '1mo', label: '1ヶ月' },
  { value: '3mo', label: '3ヶ月' },
  { value: '6mo', label: '6ヶ月' },
  { value: '1y', label: '1年' },
  { value: '3y', label: '3年' },
  { value: 'max', label: '最長' },
];

interface SettingsPanelProps {
  settings: UserSettingData;
  onChange: (next: Partial<UserSettingData>) => void;
  saving: boolean;
}

// ウォッチリストが管理する共通設定（全銘柄一律）
// 足種別・entry/exit/ATR日数・Long Profit集計対象期間はシグナル計算の“正”の値。
// ダッシュボードはこの値を表示専用で参照するのみで編集はできない。
export default function SettingsPanel({ settings, onChange, saving }: SettingsPanelProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
      <h2 className="text-sm font-bold text-gray-300 mb-3">戦略設定</h2>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">足種別</label>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
            value={settings.interval}
            onChange={(e) => onChange({ interval: e.target.value })}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">エントリー日数</label>
          <input
            type="number"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm w-20"
            value={settings.entryDays}
            onChange={(e) => onChange({ entryDays: Number(e.target.value) })}
            min={2}
            max={200}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">手仕舞い日数</label>
          <input
            type="number"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm w-20"
            value={settings.exitDays}
            onChange={(e) => onChange({ exitDays: Number(e.target.value) })}
            min={2}
            max={200}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">ATR日数</label>
          <input
            type="number"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm w-20"
            value={settings.atrDays}
            onChange={(e) => onChange({ atrDays: Number(e.target.value) })}
            min={2}
            max={200}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Long Profit集計対象期間</label>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
            value={settings.aggregationPeriod}
            onChange={(e) => onChange({ aggregationPeriod: e.target.value })}
          >
            {AGGREGATION_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">自動再取得の指定時刻</label>
          <input
            type="time"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
            value={settings.autoRefreshTime ?? ''}
            onChange={(e) => onChange({ autoRefreshTime: e.target.value || null })}
          />
        </div>

        {saving && <span className="text-xs text-gray-500">保存中...</span>}
      </div>
    </div>
  );
}
