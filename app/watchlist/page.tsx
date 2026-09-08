'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import WatchlistTable from '@/components/watchlist/WatchlistTable';
import SettingsPanel from '@/components/watchlist/SettingsPanel';
import ProgressBar from '@/components/watchlist/ProgressBar';
import AddSymbolInput from '@/components/watchlist/AddSymbolInput';
import HistoryModal from '@/components/watchlist/HistoryModal';
import { WatchlistItem, SortKey, SortDirection, BatchJob, UserSettingData } from '@/components/watchlist/types';

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
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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

  // 設定読み込み完了時に、DBへ保存されていた列ソート状態を復元する（初回のみ）
  useEffect(() => {
    if (!settings || sortInitializedRef.current) return;
    sortInitializedRef.current = true;
    if (settings.watchlistSortKey) {
      setSortKey(settings.watchlistSortKey);
      setSortDirection(settings.watchlistSortDirection ?? 'desc');
    }
  }, [settings]);

  // 列ソート状態をDBへ保存する（リロード・再ログイン・別端末でも維持するため）
  const persistSort = (key: SortKey, direction: SortDirection) => {
    fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlistSortKey: key, watchlistSortDirection: direction }),
    });
  };

  // ── 列ソート: 降順 → 昇順 → ソートなし の3状態を循環 ──
  const handleSortClick = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('desc');
      persistSort(key, 'desc');
      return;
    }
    if (sortDirection === 'desc') {
      setSortDirection('asc');
      persistSort(key, 'asc');
      return;
    }
    // ソートなしに戻す（＝手動並べ替えのベース順=sortOrder順で表示）
    setSortKey(null);
    setSortDirection('desc');
    persistSort(null, 'desc');
  };

  const getSortValue = (item: WatchlistItem, key: Exclude<SortKey, null>) => {
    switch (key) {
      case 'symbol':
        return item.symbol;
      case 'name':
        return item.name ?? '';
      case 'selected':
        return item.dashboardSelected ? 1 : 0;
      case 'signalType':
        return item.latestSignalType ?? '';
      case 'signalDate':
        return item.latestSignalDate ? new Date(item.latestSignalDate).getTime() : -Infinity;
      case 'signalPrice':
        return item.latestSignalPrice ?? -Infinity;
      case 'profitCount':
        return item.profitCount ?? -Infinity;
      case 'profitWinRate':
        return item.profitWinRate ?? -Infinity;
      case 'profitTotalProfit':
        return item.profitTotalProfit ?? -Infinity;
      default:
        return '';
    }
  };

  const sortedItems = useMemo(() => {
    // ソートなし＝APIが返すsortOrder順（＝手動並べ替えのベース順）をそのまま使用
    if (!sortKey) return items;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [items, sortKey, sortDirection]);

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

  // ── クリアボタン ──
  const handleClear = async () => {
    if (
      !confirm(
        '並び順を初期値（日経225コード順）に、Long Profit集計値・最新シグナルを空欄に戻します。よろしいですか？'
      )
    )
      return;
    await fetch('/api/watchlist/clear', { method: 'POST' });
    setSortKey(null);
    persistSort(null, 'desc');
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4">ウォッチリスト</h1>

        {settings && (
          <SettingsPanel settings={settings} onChange={handleSettingsChange} saving={savingSettings} />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <AddSymbolInput onAdd={handleAdd} />
          <button
            onClick={runSequentialBatch}
            disabled={isBusy}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm rounded px-3 py-1.5 font-semibold"
            title="最新シグナル取得→完了後にLong Profit集計取得を自動で連続実行します"
          >
            一括実行(取得+集計)
          </button>
          <button
            onClick={() => runBatchJob('SIGNAL_FETCH')}
            disabled={isBusy}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm rounded px-3 py-1.5"
          >
            最新シグナル取得
          </button>
          <button
            onClick={() => runBatchJob('PROFIT_AGGREGATION')}
            disabled={isBusy}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm rounded px-3 py-1.5"
          >
            Long Profit集計取得
          </button>
          <button
            onClick={handleSaveHistory}
            className="bg-gray-700 hover:bg-gray-600 text-sm rounded px-3 py-1.5"
          >
            履歴として保存
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="bg-gray-700 hover:bg-gray-600 text-sm rounded px-3 py-1.5"
          >
            履歴を見る
          </button>
          <button
            onClick={handleClear}
            className="bg-red-900/60 hover:bg-red-800 text-sm rounded px-3 py-1.5 ml-auto"
          >
            クリア
          </button>
        </div>

        {activeJob && isBusy && <ProgressBar job={activeJob} />}

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : (
          <WatchlistTable
            items={sortedItems}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortClick={handleSortClick}
            onToggleSelect={handleToggleSelect}
            onDelete={handleDelete}
            onReorder={handleReorder}
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
