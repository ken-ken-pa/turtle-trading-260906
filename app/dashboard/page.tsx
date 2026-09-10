// クライアント側でレンダリングする指定
'use client';

// ReactからuseState, useEffect, useRef, useCallback, Suspenseフックをインポート
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
// Next.jsのクエリパラメータ取得・ルーティング用フックをインポート（ウォッチリストからのチャート位置スクロール用）
import { useSearchParams, useRouter } from 'next/navigation';
// 共通ナビゲーションバーコンポーネントをインポート
import Navbar from '@/components/layout/Navbar';
// デスクトップ用操作バーコンポーネントをインポート
import DashboardToolbar from '@/components/dashboard/DashboardToolbar';
// モバイル用操作メニューコンポーネントをインポート
import DashboardMobileMenu from '@/components/dashboard/DashboardMobileMenu';
// チャートグリッドコンポーネントをインポート
import ChartGrid, { DashboardSymbol } from '@/components/dashboard/ChartGrid';
// ウォッチリストと表示順を一致させるための共通ソートユーティリティ・型をインポート
import { applyWatchlistSort } from '@/lib/watchlist/sort';
import { SortKeyEntry } from '@/components/watchlist/types';

/******************************************************************
 ダッシュボード本体コンポーネント
 260906仕様: 銘柄は「ウォッチリストでチェック選択された銘柄」をその並び順のまま表示するのみ。
 画面分割・表示期間のみダッシュボード側で編集可能（見た目専用の設定）。
 足種別・entry/exit/ATR日数はウォッチリストの共通設定値を表示専用で参照する。
 ******************************************************************/
function DashboardContent() {
  // 画面分割の管理ステート（初期値: 全画面＝1）
  const [splitCount, setSplitCount] = useState<number>(1);
  // 表示期間の管理ステート（初期値: 6か月、見た目のみ）
  const [period, setPeriod] = useState<string>('6mo');
  // 足種別（ウォッチリストの共通設定値。表示専用）
  const [interval, setInterval] = useState<string>('1d');
  // エントリー・手仕舞い・ATR日数（ウォッチリストの共通設定値。表示専用）
  const [entryDays, setEntryDays] = useState<number>(20);
  const [exitDays, setExitDays] = useState<number>(10);
  const [atrDays, setAtrDays] = useState<number>(20);
  // ウォッチリストでチェック選択されている銘柄一覧（その並び順のまま表示対象になる）
  const [symbols, setSymbols] = useState<DashboardSymbol[]>([]);
  // ウォッチリストの複数列ソート状態（DBに保存されている設定をそのまま反映し、チャートの表示順に使用する。
  // 空配列の場合はソートなし＝sortOrder順で表示し、ドラッグ&ドロップによる並べ替えも可能にする）
  const [sortKeys, setSortKeys] = useState<SortKeyEntry[]>([]);
  // ユーザー設定初期読み込み完了フラグ
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  // ドラッグ中のチャートインデックスの管理ステート（並び替え用）
  const [draggedChartIndex, setDraggedChartIndex] = useState<number | null>(null);
  // ドラッグ中にカーソルが重なっているチャートインデックスの管理ステート（ドロップ先ハイライト表示用）
  const [dragOverChartIndex, setDragOverChartIndex] = useState<number | null>(null);

  // URLクエリパラメータ取得（ウォッチリストからの遷移時の対象チャート指定に使用）
  const searchParams = useSearchParams();
  const router = useRouter();
  // 各チャートのDOM要素参照配列
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [highlightedChartIndex, setHighlightedChartIndex] = useState<number | null>(null);
  const hasScrolledToChartRef = useRef(false);
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  /******************************************************************
   ウォッチリストからチェック選択済み銘柄を取得する関数。
   ウォッチリストで列ソートが有効な場合はそのソート結果と同じ並び順にし、
   ソートが無効（空配列）の場合はsortOrder順（＝手動並べ替えのベース順）のまま表示する。
   ******************************************************************/
  const loadSelectedSymbols = useCallback(async (currentSortKeys: SortKeyEntry[]) => {
    const res = await fetch('/api/watchlist', { cache: 'no-store' });
    const data = await res.json();
    const list = (data.watchlist ?? []) as any[];
    const selectedRaw = list.filter((w) => w.dashboardSelected);
    // ウォッチリストと全く同じ並び替えロジックを適用することで表示順を完全に一致させる
    const ordered = applyWatchlistSort(selectedRaw, currentSortKeys);
    const selected: DashboardSymbol[] = ordered.map((w) => ({
      id: w.id,
      symbol: w.symbol,
      name: w.name,
      // 保有ポジション情報（チャートへのピンク色ライン描画に使用）
      acquisitionPrice: w.acquisitionPrice ?? null,
      acquisitionDate: w.acquisitionDate ?? null,
    }));
    setSymbols(selected);
  }, []);

  /******************************************************************
   チャートのドロップ処理関数
   ドラッグ元・ドロップ先の2銘柄のsortOrderを入れ替え、ウォッチリストへ書き戻す
   ******************************************************************/
  const handleChartDrop = async (dropIndex: number) => {
    // ウォッチリストで列ソートが有効な間は、チャートのドラッグ&ドロップ入れ替えを行わない
    // （UI上もドラッグ開始できないようにしているが、念のため二重にガードする）
    if (sortKeys.length > 0) {
      setDraggedChartIndex(null);
      setDragOverChartIndex(null);
      return;
    }
    if (draggedChartIndex === null || draggedChartIndex === dropIndex) {
      setDraggedChartIndex(null);
      setDragOverChartIndex(null);
      return;
    }
    const from = symbols[draggedChartIndex];
    const to = symbols[dropIndex];
    setDraggedChartIndex(null);
    setDragOverChartIndex(null);
    if (!from || !to) return;

    // 楽観的更新（表示上は即座に入れ替える）
    setSymbols((prev) => {
      const next = [...prev];
      [next[draggedChartIndex], next[dropIndex]] = [next[dropIndex], next[draggedChartIndex]];
      return next;
    });

    // ウォッチリストのsortOrderへ書き戻す
    await fetch('/api/watchlist/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idA: from.id, idB: to.id }),
    });
  };

  const getMostVisibleChartIndex = (): number => {
    const container = gridContainerRef.current;
    if (!container) return 0;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let bestIndex = 0;
    let bestDistance = Infinity;

    chartRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) return;
      const elCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elCenter - containerCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = idx;
      }
    });

    return bestIndex;
  };

  const handleSplitCountChange = (newSplitCount: number) => {
    const currentIndex = getMostVisibleChartIndex();
    setSplitCount(newSplitCount);
    setPendingScrollIndex(currentIndex);
  };

  const handleChartDoubleClick = (idx: number) => {
    setSplitCount(1);
    setPendingScrollIndex(idx);
  };

  /******************************************************************
   コンポーネントマウント時にユーザー固有のDB設定・ウォッチリスト選択銘柄を取得
   ******************************************************************/
  useEffect(() => {
    const loadAll = async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (!res.ok) {
          console.error('Failed to load user settings: HTTP', res.status);
        }
        const data = await res.json();
        let currentSortKeys: SortKeyEntry[] = [];
        if (data.settings) {
          // ── ダッシュボード管理項目（見た目のみ） ──
          if (data.settings.splitCount) setSplitCount(data.settings.splitCount);
          if (data.settings.period) setPeriod(data.settings.period);
          // ── ウォッチリスト管理項目（表示専用で参照） ──
          if (data.settings.interval) setInterval(data.settings.interval);
          if (data.settings.entryDays) setEntryDays(data.settings.entryDays);
          if (data.settings.exitDays) setExitDays(data.settings.exitDays);
          if (data.settings.atrDays) setAtrDays(data.settings.atrDays);
          // ── ウォッチリストの複数列ソート状態（チャート表示順・ドラッグ&ドロップ可否の判定に使用） ──
          currentSortKeys = Array.isArray(data.settings.watchlistSortKeys)
            ? data.settings.watchlistSortKeys
            : [];
          setSortKeys(currentSortKeys);
        }
        await loadSelectedSymbols(currentSortKeys);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadAll();
  }, [loadSelectedSymbols]);

  /******************************************************************
   ダッシュボード管理項目（画面分割・表示期間）のみ自動保存する副作用フック（デバウンス付）
   ******************************************************************/
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/user/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ splitCount, period }),
        });
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [splitCount, period, isLoaded]);

  /******************************************************************
   ウォッチリスト等からの遷移時にURL指定のチャートへ自動スクロールする副作用フック
   ******************************************************************/
  useEffect(() => {
    if (!isLoaded || hasScrolledToChartRef.current) return;
    const chartIndexParam = searchParams.get('chartIndex');
    if (chartIndexParam === null) return;
    const targetIndex = Number(chartIndexParam);
    if (Number.isNaN(targetIndex) || targetIndex < 0 || targetIndex >= symbols.length) return;

    hasScrolledToChartRef.current = true;

    requestAnimationFrame(() => {
      const el = chartRefs.current[targetIndex];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedChartIndex(targetIndex);
        setTimeout(() => setHighlightedChartIndex(null), 2000);
      }
    });

    router.replace('/dashboard', { scroll: false });
  }, [isLoaded, symbols.length, searchParams, router]);

  useEffect(() => {
    if (pendingScrollIndex === null) return;
    const targetIndex = pendingScrollIndex;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = chartRefs.current[targetIndex];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedChartIndex(targetIndex);
          setTimeout(() => setHighlightedChartIndex(null), 2000);
        }
      });
    });

    setPendingScrollIndex(null);
  }, [splitCount, pendingScrollIndex]);

  // モバイル用メニューの定義
  const mobileControls = (
    <DashboardMobileMenu
      splitCount={splitCount}
      onSplitCountChange={handleSplitCountChange}
      period={period}
      onPeriodChange={setPeriod}
      interval={interval}
      selectedCount={symbols.length}
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070A10] text-slate-100 overflow-hidden">
      {/* 1. 共通ナビゲーションバー */}
      <Navbar mobileMenuContent={mobileControls} />

      {/* 2. デスクトップ操作コントロールバー */}
      <DashboardToolbar
        splitCount={splitCount}
        onSplitCountChange={handleSplitCountChange}
        period={period}
        onPeriodChange={setPeriod}
        interval={interval}
        selectedCount={symbols.length}
      />

      {/* 3. チャートメインエリア */}
      <main className="flex-1 min-h-0 p-3 flex flex-col overflow-hidden">
        <ChartGrid
          splitCount={splitCount}
          symbols={symbols}
          period={period}
          interval={interval}
          entryDays={entryDays}
          exitDays={exitDays}
          atrDays={atrDays}
          dragEnabled={sortKeys.length === 0}
          highlightedChartIndex={highlightedChartIndex}
          dragOverChartIndex={dragOverChartIndex}
          onDragOverChange={setDragOverChartIndex}
          onChartDrop={handleChartDrop}
          onDragStart={(idx) => setDraggedChartIndex(idx)}
          onDragEnd={() => {
            setDraggedChartIndex(null);
            setDragOverChartIndex(null);
          }}
          setChartRef={(idx, el) => {
            chartRefs.current[idx] = el;
          }}
          onChartDoubleClick={handleChartDoubleClick}
          registerContainerRef={(el) => {
            gridContainerRef.current = el;
          }}
        />
      </main>
    </div>
  );
}

/******************************************************************
 ダッシュボードページのルートコンポーネント
 ******************************************************************/
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
