// クライアントコンポーネントであることを宣言
'use client';

// Reactのステート・副作用フックをインポート（画面幅に応じた選択肢の絞り込みに使用）
import { useState, useEffect } from 'react';
// 定数定義をインポート
import { PERIOD_OPTIONS, SPLIT_COUNT_OPTIONS, INTERVAL_OPTIONS } from './constants';

// モバイル操作メニューのPropsインターフェース定義
// 260906仕様: 銘柄数・足種別・戦略設定の編集UIは廃止（すべて/watchlistで一元管理）。
// 画面分割・表示期間のみ編集可能、足種別・選択銘柄数は表示のみ。
export interface DashboardMobileMenuProps {
  // 画面分割（全画面/2分割/4分割）
  splitCount: number;
  // 画面分割変更コールバック
  onSplitCountChange: (count: number) => void;
  // 表示期間
  period: string;
  // 表示期間変更コールバック
  onPeriodChange: (period: string) => void;
  // 足種別（表示専用）
  interval: string;
  // ウォッチリストで現在チェック選択されている銘柄数（表示のみ）
  selectedCount: number;
}

/******************************************************************
 モバイル用ダッシュボード操作メニューコンポーネント
 モバイルドロワー内に表示する各種コントロール（画面数、期間）と
 足種別・選択銘柄数の表示を提供します
 ******************************************************************/
export default function DashboardMobileMenu({
  splitCount,
  onSplitCountChange,
  period,
  onPeriodChange,
  interval,
  selectedCount,
}: DashboardMobileMenuProps) {
  // 画面幅がTailwindの md ブレークポイント（768px）以上かどうかの管理ステート
  const [isMdOrWider, setIsMdOrWider] = useState(false);

  // 画面幅の変化を監視する副作用フック
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const update = () => setIsMdOrWider(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // 現在の画面幅で選択可能な画面分割の選択肢（スマホ幅=全画面のみ／ノートパッド幅=全画面・2分割まで）
  const availableSplitOptions = SPLIT_COUNT_OPTIONS.filter((item) => (isMdOrWider ? item.val <= 2 : item.val === 1));

  const displaySplitCount = availableSplitOptions.some((item) => item.val === splitCount)
    ? splitCount
    : availableSplitOptions[availableSplitOptions.length - 1].val;

  const intervalLabel = INTERVAL_OPTIONS.find((o) => o.val === interval)?.label ?? interval;

  // モバイル用コントロール群のJSXを返却
  return (
    <>
      {/* 画面分割セクション */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          画面分割
        </div>
        <select
          value={displaySplitCount}
          onChange={(e) => onSplitCountChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-sm font-bold text-slate-200 focus:outline-none focus:border-blue-500 transition"
        >
          {availableSplitOptions.map((item) => (
            <option key={item.val} value={item.val}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* 表示銘柄数（表示のみ・変更はウォッチリスト画面で行う） */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          表示銘柄
        </div>
        <a
          href="/watchlist"
          className="block w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-sm font-bold text-blue-400 text-center"
        >
          {selectedCount}銘柄選択中（ウォッチリストで変更）
        </a>
      </div>

      {/* 期間セクション */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          期間
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PERIOD_OPTIONS.map((item) => (
            <button
              key={item.val}
              onClick={() => onPeriodChange(item.val)}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                period === item.val
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 足種別（表示専用。変更はウォッチリストの共通設定パネルで行う） */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
          足（表示専用）
        </div>
        <div className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm font-bold text-slate-300 text-center">
          {intervalLabel}
        </div>
      </div>
    </>
  );
}
