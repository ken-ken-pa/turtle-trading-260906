// クライアントコンポーネントであることを宣言
'use client';

// Reactの参照・副作用フックをインポート（Shift+ホイールでの縦スクロール制御に使用）
import { useEffect, useRef } from 'react';
// タートルチャート描画コンポーネントをインポート
import TurtleChart from './TurtleChart';

// ダッシュボードに表示する銘柄1件分の型定義（ウォッチリストのdashboardSelected項目をそのまま利用）
export interface DashboardSymbol {
  id: string; // WatchlistレコードのID（ドラッグ&ドロップでの並べ替え書き戻しに使用）
  symbol: string; // 証券コード（4桁）
  name: string | null;
  // 保有ポジション情報（ウォッチリストで手入力された値。チャートへのピンク色ライン描画に使用）
  acquisitionPrice?: number | null; // 取得単価（横線の描画位置）
  acquisitionDate?: string | null; // 取得日（縦線の描画位置）
}

// チャートグリッドのPropsインターフェース定義
// 260906仕様: 銘柄は「ウォッチリストでチェック選択された銘柄」をその並び順のまま受け取るのみで、
// ダッシュボード側での銘柄検索・追加・変更は行わない（onSymbolChangeは廃止）。
// entry/exit/ATR日数・足種別はウォッチリストの共通設定値をそのまま表示に使う（編集不可）。
export interface ChartGridProps {
  // 画面分割（1画面あたりに並べるチャート数：1=全画面／2=2分割／4=4分割）
  splitCount: number;
  // 表示対象銘柄一覧（ウォッチリストでチェック選択された銘柄。並び順そのまま）
  symbols: DashboardSymbol[];
  // 表示期間
  period: string;
  // 足種別（ウォッチリストの設定値。表示専用）
  interval: string;
  // エントリー期間（ウォッチリストの設定値。表示専用）
  entryDays: number;
  // 手仕舞い期間（ウォッチリストの設定値。表示専用）
  exitDays: number;
  // ATR期間（ウォッチリストの設定値。表示専用）
  atrDays: number;
  // ハイライト対象のチャートインデックス
  highlightedChartIndex: number | null;
  // ドラッグオーバー中のチャートインデックス
  dragOverChartIndex: number | null;
  // ドラッグ&ドロップによる並べ替えを許可するか（ウォッチリストで列ソートが有効な間はfalseにして無効化する）
  dragEnabled: boolean;
  // ドラッグオーバー設定コールバック
  onDragOverChange: (index: number | null) => void;
  // チャートドロップコールバック（ドラッグ元・ドロップ先のインデックスを通知。並び順の書き戻しは親が行う）
  onChartDrop: (dropIndex: number) => void;
  // ドラッグ開始コールバック
  onDragStart: (index: number) => void;
  // ドラッグ終了コールバック
  onDragEnd: () => void;
  // チャートDOM要素参照コールバック
  setChartRef: (index: number, el: HTMLDivElement | null) => void;
  // チャートカードのダブルクリック時に呼び出されるコールバック（画面分割を全画面にして当該チャートを表示するため）
  onChartDoubleClick: (index: number) => void;
  // スクロールコンテナ要素の参照を親へ通知するコールバック
  registerContainerRef?: (el: HTMLDivElement | null) => void;
}

/******************************************************************
 チャートグリッドコンポーネント
 画面分割数（splitCount：全画面/2分割/4分割）に応じたグリッド配置と、
 ウォッチリストでチェック選択された銘柄数分のチャートをページ単位でスクロール表示する。
 splitCount枚を1ページとして、それを超える銘柄は下スクロールで
 次のページ（次のsplitCount枚）が順に表示される。
 例）全画面(1) + 4銘柄 → 1画面に1銘柄、スクロールで2,3,4銘柄目が順に表示
 例）2分割(2) + 8銘柄 → 1画面に2銘柄、スクロールで2銘柄ずつ計4ページ表示
 ******************************************************************/
export default function ChartGrid({
  splitCount,
  symbols,
  period,
  interval,
  entryDays,
  exitDays,
  atrDays,
  highlightedChartIndex,
  dragOverChartIndex,
  dragEnabled,
  onDragOverChange,
  onChartDrop,
  onDragStart,
  onDragEnd,
  setChartRef,
  onChartDoubleClick,
  registerContainerRef,
}: ChartGridProps) {
  const symbolCount = symbols.length;

  // 画面分割数の単位でページが割り切れるよう、末尾を空きマスで埋めた総描画数を算出
  const paddedTotal = Math.ceil(symbolCount / splitCount) * splitCount;

  // 全画面（1分割）の場合：常に1列で、1銘柄＝1ページ分の高さを占有し、縦スクロールで次の銘柄へ
  // 2分割／4分割の場合：md以上（ノートパッド幅以上）で2列、md未満（スマホ幅）は1列
  const gridColsClass = splitCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';

  // 各チャートの高さクラス（画面分割数に応じてページ単位の高さを固定し、それを超える分はスクロールで閲覧させる）
  const itemHeightClass =
    splitCount === 1
      ? 'h-[calc(100svh-8.5rem)] lg:h-[calc(100vh-8.75rem)]'
      : splitCount === 2
      ? 'h-[calc(50svh-2.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc(100vh-8.75rem)]'
      : 'h-[calc(50svh-2.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc((100vh-8.75rem)/2)]';

  // チャート一覧のスクロールコンテナへの参照（Shift+ホイールでの縦スクロール制御に使用）
  const containerRef = useRef<HTMLDivElement | null>(null);

  /******************************************************************
   Shift+マウスホイールでの縦スクロール対応。
   チャート本体（lightweight-charts）がマウスホイールでの拡大縮小を内部的に処理するため、
   コンテナ要素へのリスナー登録だけでは確実に先取りできない場合がある。
   window自体にcapture:trueで登録することで、DOM構造やライブラリ内部の実装に関わらず、
   必ず最初にこのハンドラーが実行されるようにする。
   ******************************************************************/
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      const container = containerRef.current;
      if (!container) return;
      // チャート一覧の表示範囲内でのホイール操作のみを対象にする（ナビゲーション等への影響を避ける）
      if (!container.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      container.scrollBy({ top: delta, behavior: 'auto' });
    };

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
  }, []);

  if (symbolCount === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-slate-500 text-sm">
        表示する銘柄がありません。
        <a href="/watchlist" className="text-blue-400 hover:text-blue-300 underline ml-1">
          ウォッチリストで銘柄を選択してください
        </a>
      </div>
    );
  }

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        registerContainerRef?.(el);
      }}
      className={`flex-1 min-h-0 grid ${gridColsClass} gap-3 overflow-y-auto no-scrollbar`}
    >
      {Array.from({ length: paddedTotal }).map((_, idx) => {
        // 銘柄数を超えた末尾の空きマス（グリッド形状維持用のプレースホルダー）
        if (idx >= symbolCount) {
          return (
            <div
              key={`placeholder-${idx}`}
              className={`${itemHeightClass} shrink-0 min-h-[280px] rounded-xl border border-dashed border-slate-800/60`}
            />
          );
        }

        const target = symbols[idx];

        return (
          <div
            key={target.id}
            ref={(el) => setChartRef(idx, el)}
            className={`${itemHeightClass} shrink-0 min-h-[280px] rounded-xl transition-shadow duration-500 ${
              highlightedChartIndex === idx
                ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#070A10]'
                : dragOverChartIndex === idx
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#070A10]'
                : ''
            }`}
            onDragOver={(e) => {
              if (!dragEnabled) return;
              e.preventDefault();
              onDragOverChange(idx);
            }}
            onDragLeave={() => onDragOverChange(null)}
            onDrop={(e) => {
              if (!dragEnabled) return;
              e.preventDefault();
              onChartDrop(idx);
            }}
          >
            <TurtleChart
              index={idx}
              period={period}
              interval={interval}
              symbol={`${target.symbol}.T`}
              symbolEditable={false}
              entryDays={entryDays}
              exitDays={exitDays}
              atrDays={atrDays}
              acquisitionPrice={target.acquisitionPrice ?? null}
              acquisitionDate={target.acquisitionDate ?? null}
              dragEnabled={dragEnabled}
              onDragHandleStart={() => onDragStart(idx)}
              onDragHandleEnd={onDragEnd}
              onChartDoubleClick={() => onChartDoubleClick(idx)}
            />
          </div>
        );
      })}
    </div>
  );
}
