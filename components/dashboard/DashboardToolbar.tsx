// クライアントコンポーネントであることを宣言
'use client';

// ダッシュボード定数群をインポート
import { PERIOD_OPTIONS, SPLIT_COUNT_OPTIONS, INTERVAL_OPTIONS } from './constants';

// ツールバーのPropsインターフェース定義
// 260906仕様: 銘柄検索欄・銘柄数(symbolCount)・戦略設定(entry/exit/ATR)の編集UIは廃止。
// これらはすべて /watchlist ページの共通設定パネルで一元管理する。
// ダッシュボードは「画面分割」「表示期間」のみ編集可能（見た目専用の設定）。
// 足種別は編集不可の表示専用バッジとして残す（ウォッチリスト側の設定値を参照するのみ）。
export interface DashboardToolbarProps {
  // 画面分割（全画面/2分割/4分割）
  splitCount: number;
  // 画面分割変更コールバック
  onSplitCountChange: (count: number) => void;
  // 表示期間（見た目のみ）
  period: string;
  // 表示期間変更コールバック
  onPeriodChange: (period: string) => void;
  // 足種別（表示専用。ウォッチリストの設定値をそのまま表示する）
  interval: string;
  // ウォッチリストで現在チェック選択されている銘柄数（表示のみ）
  selectedCount: number;
}

/******************************************************************
 デスクトップ用ダッシュボード操作バーコンポーネント
 画面分割数・表示期間の操作UIと、足種別・選択銘柄数の表示を提供します
 ******************************************************************/
export default function DashboardToolbar({
  splitCount,
  onSplitCountChange,
  period,
  onPeriodChange,
  interval,
  selectedCount,
}: DashboardToolbarProps) {
  // 足種別コードから表示ラベルへの変換
  const intervalLabel = INTERVAL_OPTIONS.find((o) => o.val === interval)?.label ?? interval;

  // 操作コントロールバーのJSXを返却
  return (
    // 操作コントロールバー（lg以上のデスクトップのみ表示）
    <div className="flex-none px-6 py-2.5 bg-[#0B0F19]/60 border-b border-slate-800/60 hidden lg:flex items-center justify-between flex-wrap gap-4 z-20">
      {/* 左側（タイトルおよび画面分割選択）コンテナ */}
      <div className="flex items-center gap-4">
        {/* タイトルテキスト */}
        <span className="text-sm font-black tracking-wider text-slate-200">TURTLE TRADING</span>
        {/* 画面分割選択 */}
        <div className="flex items-center gap-2">
          {/* 画面分割ラベル */}
          <label htmlFor="split-count-select" className="text-xs font-bold text-slate-400">
            画面分割
          </label>
          {/* 画面分割セレクト要素 */}
          <select
            id="split-count-select"
            value={splitCount}
            onChange={(e) => onSplitCountChange(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            {/* 画面分割選択肢の生成 */}
            {SPLIT_COUNT_OPTIONS.map((item) => (
              <option key={item.val} value={item.val}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* ウォッチリストで選択中の銘柄数（表示のみ。追加・変更はウォッチリスト画面で行う） */}
        <span className="text-xs text-slate-500">
          表示銘柄数: <span className="font-bold text-slate-300">{selectedCount}</span>
          <a href="/watchlist" className="ml-2 text-blue-400 hover:text-blue-300 underline">
            ウォッチリストで選択
          </a>
        </span>
      </div>

      {/* 右側（期間切り替え・足種別表示）コンテナ */}
      <div className="flex items-center gap-4">
        {/* 期間ボタングループ */}
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((item) => (
            <button
              key={item.val}
              onClick={() => onPeriodChange(item.val)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                period === item.val
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 足種別バッジ（表示専用。変更はウォッチリストの共通設定パネルで行う） */}
        <span
          title="足種別はウォッチリストの共通設定で変更できます（シグナル計算に直結するため、ダッシュボードでは表示のみ）"
          className="px-3 py-1 rounded-md text-xs font-bold bg-slate-800/80 border border-slate-700/60 text-slate-300 cursor-default select-none"
        >
          {intervalLabel}(表示専用)
        </span>
      </div>
    </div>
  );
}
