'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import MobileDrawer from '@/components/layout/MobileDrawer';
import WatchlistTable from '@/components/watchlist/WatchlistTable';
import SettingsPanel from '@/components/watchlist/SettingsPanel';
import ProgressBar from '@/components/watchlist/ProgressBar';
import AddSymbolInput from '@/components/watchlist/AddSymbolInput';
import HistoryModal from '@/components/watchlist/HistoryModal';
import { WatchlistItem, SortKeyEntry, BatchJob, UserSettingData } from '@/components/watchlist/types';
import { applyWatchlistSort } from '@/lib/watchlist/sort';

const BATCH_JOB_STORAGE_KEY = 'watchlist:activeBatchJobId';
const AUTO_CHAIN_STORAGE_KEY = 'watchlist:autoChainStep'; // 'PROFIT_AGGREGATION'待ち状態をリロード後も保持するため
const POLL_INTERVAL_MS = 1500;

// 今日の日付を「YYYY-MM-DD」形式で取得（自動再取得の本日実行済み判定に使用）
function todayDateString(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettingData | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sortKeys, setSortKeys] = useState<SortKeyEntry[]>([]);
  const [activeJob, setActiveJob] = useState<BatchJob | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAutoRefreshDialog, setShowAutoRefreshDialog] = useState(false);
  const [autoRefreshRunning, setAutoRefreshRunning] = useState(false);

  // '最新シグナル取得'→'Long Profit集計取得'の自動連続実行チェーン中かどうか
  // （trueの間はジョブ完了時に次のジョブを自動起動し、両方完了したら本日実行済みとして記録する）
  const autoChainRef = useRef(false);

  const workerRef = useRef<Worker | null>(null);
  const settingsSaveTimer = useRef<NodeJS.Timeout | null>(null);
  // 設定から読み込んだソート状態を最初の1回だけ反映するためのフラグ
  // （履歴復元などで settings が再読込されても、以後はユーザーの操作を優先し上書きしない）
  const sortInitializedRef = useRef(false);

  const loadWatchlist = useCallback(async () => {
    const res = await fetch('/api/watchlist', { cache: 'no-store' });
    const data = await res.json();
    setItems(data.watchlist ?? []);
    setLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/user/settings');
    const data = await res.json();
    setSettings(data.settings);
  }, []);

  useEffect(() => {
    loadWatchlist();
    loadSettings();
  }, [loadWatchlist, loadSettings]);

  // 設定読み込み完了時に、DBへ保存されていた複数列ソート状態を復元する（初回のみ）
  useEffect(() => {
    if (!settings || sortInitializedRef.current) return;
    sortInitializedRef.current = true;
    if (settings.watchlistSortKeys && settings.watchlistSortKeys.length > 0) {
      setSortKeys(settings.watchlistSortKeys);
    }
  }, [settings]);

  // 複数列ソート状態をDBへ保存する（リロード・再ログイン・別端末でも維持するため）
  const persistSortKeys = (keys: SortKeyEntry[]) => {
    fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlistSortKeys: keys }),
    });
  };

  // ── 列ソート（複数列対応。Excelライクな優先順位付きソート） ──
  // ・未ソートの列をクリック：最下位優先として追加し、降順から開始する
  // ・既にソート対象の列をクリック：降順→昇順、と向きを進める（優先順位はそのまま）。
  //   「昇順」の状態から再度クリックした場合（＝次はソートなしへ進む場合）は、
  //   WatchlistTable側で確認ポップアップが表示されるため、ここには到達しない。
  const handleSortClick = (key: SortKeyEntry['key']) => {
    const idx = sortKeys.findIndex((s) => s.key === key);

    if (idx === -1) {
      // 新規クリック：最下位優先として追加し、降順から開始
      const next = [...sortKeys, { key, direction: 'desc' as const }];
      setSortKeys(next);
      persistSortKeys(next);
      return;
    }

    const current = sortKeys[idx];
    if (current.direction === 'desc') {
      // 降順 → 昇順（優先順位はそのまま）
      const next = sortKeys.map((s, i) => (i === idx ? { ...s, direction: 'asc' as const } : s));
      setSortKeys(next);
      persistSortKeys(next);
    }
    // direction === 'asc' の場合はWatchlistTable側でポップアップ表示に切り替わるため、ここでは何もしない
  };

  // ソート解除確認ポップアップで「はい」が選択された場合：優先順位リストから除外し、他の列の優先順位は詰めて維持
  const handleSortClearConfirm = (key: SortKeyEntry['key']) => {
    const next = sortKeys.filter((s) => s.key !== key);
    setSortKeys(next);
    persistSortKeys(next);
  };

  // ソート解除確認ポップアップで「いいえ」が選択された場合：優先順位は変えず、降順に戻す
  const handleSortClearCancel = (key: SortKeyEntry['key']) => {
    const next = sortKeys.map((s) => (s.key === key ? { ...s, direction: 'desc' as const } : s));
    setSortKeys(next);
    persistSortKeys(next);
  };

  // 表示順の算出（複数列ソート）は、ダッシュボードと表示順を完全に一致させるため
  // 共通ユーティリティ(lib/watchlist/sort.ts)のロジックをそのまま利用する
  const sortedItems = useMemo(() => applyWatchlistSort(items, sortKeys), [items, sortKeys]);

  // 「表示」チェックが入っている銘柄について、ダッシュボードでの表示順（chartIndex）を算出する。
  // ダッシュボード側は「dashboardSelected=trueの銘柄のみ、ウォッチリストと同じソート順」で並ぶため、
  // ここでも同じsortedItemsから選択済み銘柄だけを抽出し、その順番をインデックスとして対応付ける
  const dashboardChartIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const item of sortedItems) {
      if (item.dashboardSelected) {
        map.set(item.id, idx);
        idx++;
      }
    }
    return map;
  }, [sortedItems]);

  // ── 銘柄追加 ──
  const handleAdd = async (symbol: string, name: string) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name }),
    });
    if (res.ok) {
      loadWatchlist();
    } else {
      const data = await res.json();
      alert(data.error ?? '追加に失敗しました');
    }
  };

  // ── 銘柄削除 ──
  const handleDelete = async (id: string) => {
    if (!confirm('この銘柄をウォッチリストから削除します。よろしいですか？')) return;
    const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('削除に失敗しました。時間を置いて再度お試しください。');
      return;
    }
    loadWatchlist();
  };

  // ── ダッシュボード表示チェックのトグル ──
  const handleToggleSelect = async (id: string, selected: boolean) => {
    const prevItems = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, dashboardSelected: selected } : i)));
    const res = await fetch(`/api/watchlist/${id}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected }),
    });
    if (!res.ok) {
      // 失敗時は表示を元に戻す
      setItems(prevItems);
      alert('更新に失敗しました。時間を置いて再度お試しください。');
    }
  };

  // ── 取得単価・保有株数・取得日の更新（3項目すべて揃うと自動でダッシュボード表示チェックがONになる。
  //     サーバー側の計算結果（dashboardSelected・unitProfit・totalProfitの変化を含む）をそのまま反映する） ──
  const handleUpdateAcquisition = async (
    id: string,
    patch: Partial<Pick<WatchlistItem, 'acquisitionPrice' | 'acquisitionShares' | 'acquisitionDate'>>
  ) => {
    const prevItems = items;
    // 楽観的更新（サーバー応答後に正式な値で上書きする）
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const res = await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setItems(prevItems);
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? '更新に失敗しました。時間を置いて再度お試しください。');
      return;
    }
    const data = await res.json();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data.watchlist } : i)));
  };

  // ── 手動並べ替え（ドラッグ&ドロップ確定） ──
  const handleReorder = async (orderedIds: string[]) => {
    const prevItems = items;
    // 楽観的更新
    const byId = new Map(items.map((i) => [i.id, i]));
    setItems(orderedIds.map((id, index) => ({ ...byId.get(id)!, sortOrder: index })));
    const res = await fetch('/api/watchlist/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
      // 失敗時は表示を元に戻し、サーバー側と食い違わないようにする
      setItems(prevItems);
      alert('並べ替えの保存に失敗しました。時間を置いて再度お試しください。');
    }
  };

  // ── 取得値クリア：最新シグナル・Long Profit集計値・単価損益・損益合計のみをクリアする。
  //     並び順・選択状態・保有ポジション情報（取得単価・保有株数・取得日）は維持する ──
  const handleClearSignals = async () => {
    if (
      !confirm(
        '取得値とそれに関係する値をクリアします。具体的には以下をクリアします。\n\n最新シグナル、Long Profit集計、単価損益、損益合計\n\n実施しますか？'
      )
    )
      return;
    await fetch('/api/watchlist/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signals' }),
    });
    loadWatchlist();
  };

  // ── 全クリア：取得値クリアの内容に加え、並び順（列ソート・ドラッグ順の両方）・
  //     取得単価・保有株数・取得日・ダッシュボード表示チェックもすべて初期状態に戻す ──
  const handleClearAll = async () => {
    if (
      !confirm(
        '初期値に戻します。具体的には以下をクリアします。\n\n最新シグナル、Long Profit集計、単価損益、損益合計、並び替え、取得単価、保有株数、取得日、チェックボックスの選択\n\n実施しますか？'
      )
    )
      return;
    await fetch('/api/watchlist/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'all' }),
    });
    setSortKeys([]);
    persistSortKeys([]);
    loadWatchlist();
  };

  // ── 共通設定の変更（デバウンス保存） ──
  const handleSettingsChange = (patch: Partial<UserSettingData>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    settingsSaveTimer.current = setTimeout(async () => {
      setSavingSettings(true);
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      setSavingSettings(false);
    }, 600);
  };

  // ── バッチジョブ（最新シグナル取得 / Long Profit集計取得） ──
  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => stopWorker, [stopWorker]);

  const startWorker = useCallback(
    (jobId: string) => {
      const worker = new Worker('/workers/batchWorker.js');
      workerRef.current = worker;
      worker.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'progress' && payload) {
          setActiveJob(payload);
          if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
            stopWorker();
            localStorage.removeItem(BATCH_JOB_STORAGE_KEY);
            loadWatchlist();

            // 自動再取得チェーン中の場合：SIGNAL_FETCH完了後は続けてPROFIT_AGGREGATIONを起動、
            // PROFIT_AGGREGATION完了後は本日実行済みとして記録してチェーンを終了する
            if (autoChainRef.current && payload.status === 'COMPLETED') {
              if (payload.type === 'SIGNAL_FETCH') {
                localStorage.setItem(AUTO_CHAIN_STORAGE_KEY, 'PROFIT_AGGREGATION');
                runBatchJob('PROFIT_AGGREGATION');
              } else if (payload.type === 'PROFIT_AGGREGATION') {
                autoChainRef.current = false;
                localStorage.removeItem(AUTO_CHAIN_STORAGE_KEY);
                setAutoRefreshRunning(false);
                fetch('/api/user/settings/auto-refresh-complete', { method: 'POST' }).then(loadSettings);
              }
            } else if (autoChainRef.current && payload.status === 'FAILED') {
              // 失敗した場合はチェーンを中断する（本日実行済みにはしない＝次回アクセス時に再度促す）
              autoChainRef.current = false;
              localStorage.removeItem(AUTO_CHAIN_STORAGE_KEY);
              setAutoRefreshRunning(false);
            }
          }
        }
      };
      worker.postMessage({ type: 'start', jobId, intervalMs: POLL_INTERVAL_MS });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopWorker, loadWatchlist, loadSettings]
  );

  const runBatchJob = async (type: 'SIGNAL_FETCH' | 'PROFIT_AGGREGATION') => {
    const res = await fetch('/api/batch/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    setActiveJob(data.job);
    localStorage.setItem(BATCH_JOB_STORAGE_KEY, data.job.id);
    if (data.job.status === 'RUNNING') {
      startWorker(data.job.id);
    }
  };

  // ページ再読み込み時、実行中ジョブがあればポーリングを再開する（自動再取得チェーンの状態も復元）
  useEffect(() => {
    const savedJobId = localStorage.getItem(BATCH_JOB_STORAGE_KEY);
    if (!savedJobId) return;
    if (localStorage.getItem(AUTO_CHAIN_STORAGE_KEY)) {
      autoChainRef.current = true;
      setAutoRefreshRunning(true);
    }
    (async () => {
      const res = await fetch(`/api/batch/status?jobId=${savedJobId}`);
      if (!res.ok) {
        localStorage.removeItem(BATCH_JOB_STORAGE_KEY);
        localStorage.removeItem(AUTO_CHAIN_STORAGE_KEY);
        return;
      }
      const data = await res.json();
      if (data.job.status === 'RUNNING') {
        setActiveJob(data.job);
        startWorker(savedJobId);
      } else {
        localStorage.removeItem(BATCH_JOB_STORAGE_KEY);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 1日1回の自動再取得（ブラウザ主導） ──
  // 指定時刻を過ぎていて、本日まだ実行していなければ確認ダイアログを表示する。
  const checkAutoRefreshDue = useCallback(() => {
    if (!settings?.autoRefreshTime) return;
    if (activeJob?.status === 'RUNNING' || autoChainRef.current) return; // 既に何か実行中なら促さない

    const lastRunDate = settings.lastAutoRefreshDate ? settings.lastAutoRefreshDate.split('T')[0] : null;
    if (lastRunDate === todayDateString()) return; // 本日実行済み

    const [h, m] = settings.autoRefreshTime.split(':').map(Number);
    const now = new Date();
    const threshold = new Date();
    threshold.setHours(h, m, 0, 0);
    if (now < threshold) return; // まだ指定時刻前

    setShowAutoRefreshDialog(true);
  }, [settings, activeJob]);

  // 設定読み込み後、および以後1分おきに指定時刻超過をチェックする
  useEffect(() => {
    checkAutoRefreshDue();
    const timer = window.setInterval(checkAutoRefreshDue, 60_000);
    return () => window.clearInterval(timer);
  }, [checkAutoRefreshDue]);

  // 「最新シグナル取得」→(完了後)「Long Profit集計取得」の順に自動連続実行する共通処理。
  // 1日1回の自動再取得ダイアログ、および手動の「一括実行」ボタンの両方から呼び出す。
  // 完了時は本日実行済みとして記録する（同じ日に自動再取得の確認ダイアログが重複して出ないようにするため）。
  const runSequentialBatch = () => {
    autoChainRef.current = true;
    setAutoRefreshRunning(true);
    localStorage.setItem(AUTO_CHAIN_STORAGE_KEY, 'SIGNAL_FETCH');
    runBatchJob('SIGNAL_FETCH');
  };

  // 自動再取得の確認ダイアログでOKが押された場合
  const handleConfirmAutoRefresh = () => {
    setShowAutoRefreshDialog(false);
    runSequentialBatch();
  };

  // ── 履歴として保存 ──
  const handleSaveHistory = async () => {
    const memo = prompt('この状態の覚書（再利用時の目安）を入力してください');
    if (!memo) return;
    const res = await fetch('/api/watchlist/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? '保存に失敗しました');
    }
  };

  const isBusy = activeJob?.status === 'RUNNING' || autoRefreshRunning;

  // ツールバーの各種ボタン群。lg以上（横並び）とlg未満（ハンバーガーメニュー内・縦積み）の
  // 両方で見た目だけ変えて共通利用する（stacked=trueの場合は縦積み・幅いっぱいのボタンにする）
  const renderToolbarButtons = (stacked: boolean) => {
    const btnBase = stacked ? 'w-full text-sm rounded px-3 py-2' : 'text-sm rounded px-3 py-1.5';
    return (
      <>
        <AddSymbolInput onAdd={handleAdd} />
        <button
          onClick={runSequentialBatch}
          disabled={isBusy}
          className={`bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold ${btnBase}`}
          title="シグナル取得→完了後にLong Profit集計取得を自動で連続実行します"
        >
          一括実行(取得+集計)
        </button>
        <button
          onClick={() => runBatchJob('SIGNAL_FETCH')}
          disabled={isBusy}
          className={`bg-blue-600 hover:bg-blue-500 disabled:opacity-50 ${btnBase}`}
        >
          シグナル取得
        </button>
        <button
          onClick={() => runBatchJob('PROFIT_AGGREGATION')}
          disabled={isBusy}
          className={`bg-purple-600 hover:bg-purple-500 disabled:opacity-50 ${btnBase}`}
        >
          Long Profit集計取得
        </button>
        <button onClick={handleSaveHistory} className={`bg-gray-700 hover:bg-gray-600 ${btnBase}`}>
          履歴として保存
        </button>
        <button onClick={() => setShowHistoryModal(true)} className={`bg-gray-700 hover:bg-gray-600 ${btnBase}`}>
          履歴を見る
        </button>
        <button
          onClick={handleClearSignals}
          className={`bg-orange-900/60 hover:bg-orange-800 ${btnBase} ${stacked ? '' : 'ml-auto'}`}
        >
          取得値クリア
        </button>
        <button onClick={handleClearAll} className={`bg-red-900/60 hover:bg-red-800 ${btnBase}`}>
          全クリア
        </button>
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-950 text-white">
      <Navbar />

      {/* 固定部分：戦略設定・ツールバー・進捗バー（スクロールしない） */}
      <div className="flex-none max-w-7xl w-full mx-auto px-4 pt-4">
        {/* 設定パネル・ツールバー：lg（デスクトップ）以上はそのまま表示 */}
        <div className="hidden lg:block">
          {settings && (
            <SettingsPanel settings={settings} onChange={handleSettingsChange} saving={savingSettings} />
          )}
          <div className="flex flex-wrap items-center gap-2 mb-3">{renderToolbarButtons(false)}</div>
        </div>

        {/* 設定パネル・ツールバー：lg未満（タブレット・スマホ）はハンバーガーメニューに収める */}
        <div className="lg:hidden mb-3 flex justify-end">
          <MobileDrawer>
            <div className="space-y-5">
              {settings && (
                <SettingsPanel settings={settings} onChange={handleSettingsChange} saving={savingSettings} />
              )}
              <div className="flex flex-col gap-2">{renderToolbarButtons(true)}</div>
            </div>
          </MobileDrawer>
        </div>

        {activeJob && isBusy && <ProgressBar job={activeJob} />}
      </div>

      {/* スクロール部分：一覧の列見出し／簡易ソートバーは内部で固定し、データ行・カードのみがスクロールする
          （WatchlistTable内部でヘッダー行をsticky指定しているため、この枠の高さが基準になる） */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 pb-4">
        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : (
          <WatchlistTable
            items={sortedItems}
            sortKeys={sortKeys}
            dashboardChartIndexMap={dashboardChartIndexMap}
            onSortClick={handleSortClick}
            onSortClearConfirm={handleSortClearConfirm}
            onSortClearCancel={handleSortClearCancel}
            onToggleSelect={handleToggleSelect}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onUpdateAcquisition={handleUpdateAcquisition}
          />
        )}
      </div>

      {showHistoryModal && (
        <HistoryModal
          onClose={() => setShowHistoryModal(false)}
          onRestored={() => {
            loadWatchlist();
            loadSettings();
          }}
        />
      )}

      {showAutoRefreshDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-5">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {
                '本日の自動取得がまだです。今すぐ取得しますか？\n取得中はパソコンとWEB画面を閉じないでください。'
              }
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAutoRefreshDialog(false)}
                className="text-sm bg-gray-700 hover:bg-gray-600 rounded px-4 py-1.5"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmAutoRefresh}
                className="text-sm bg-blue-600 hover:bg-blue-500 rounded px-4 py-1.5"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
