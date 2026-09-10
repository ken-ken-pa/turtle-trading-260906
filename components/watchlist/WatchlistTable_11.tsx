'use client';

import { useState } from 'react';
import { WatchlistItem, SortKeyEntry } from './types';
import { SORT_LABELS } from '@/lib/watchlist/sort';

// 取得単価・保有株数の更新パッチ型（取得日も含む3項目のいずれかを部分更新する）
type AcquisitionPatch = Partial<
  Pick<WatchlistItem, 'acquisitionPrice' | 'acquisitionShares' | 'acquisitionDate'>
>;

interface WatchlistTableProps {
  items: WatchlistItem[]; // 表示順（ソート適用済み or ベース順）に並んだ配列
  sortKeys: SortKeyEntry[]; // 複数列ソートの優先順位付き配列（先頭が第1優先。空配列＝ソートなし）
  onSortClick: (key: SortKeyEntry['key']) => void; // 新規追加、または降順→昇順への遷移
  onSortClearConfirm: (key: SortKeyEntry['key']) => void; // ソート解除確認ポップアップで「はい」
  onSortClearCancel: (key: SortKeyEntry['key']) => void; // ソート解除確認ポップアップで「いいえ」（降順へ戻す）
  onToggleSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void; // ドラッグ&ドロップ確定時、現在の並び順（全行分）を通知
  onUpdateAcquisition: (id: string, patch: AcquisitionPatch) => void; // 取得単価・保有株数・取得日の更新
}

const INTERVAL_SIGNAL_LABEL: Record<string, string> = {
  LONG_ENTRY: 'Long Entry',
  EXIT_LONG: 'Exit Long',
};

export default function WatchlistTable({
  items,
  sortKeys,
  onSortClick,
  onSortClearConfirm,
  onSortClearCancel,
  onToggleSelect,
  onDelete,
  onReorder,
  onUpdateAcquisition,
}: WatchlistTableProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 取得単価・保有株数の編集中セル管理（フォーカス中は生の数値文字列を保持し、
  // フォーカスを外した(blur)タイミングでカンマ区切り表示に戻しつつ保存する）
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: 'acquisitionPrice' | 'acquisitionShares';
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // ソート解除確認ポップアップの表示状態（クリックされた列見出しの直上に表示するため、
  // その見出しボタンの画面上の位置(top/left中央)を保持する）
  const [clearConfirmPopup, setClearConfirmPopup] = useState<{
    key: SortKeyEntry['key'];
    top: number;
    left: number;
  } | null>(null);

  // 列ヘッダークリックによるソートが1つでも有効な間は、手動並べ替え(ドラッグ&ドロップ)は無効にする
  // （「ソートなし」に戻すとベース順=手動並べ替え結果に戻る仕様のため、ソート中の並べ替えは意味を持たない）
  const dragEnabled = sortKeys.length === 0;

  // 列ヘッダークリック時の分岐処理。
  // 現在「昇順」の列を再クリックした場合のみ、次は「ソートなしへ進む」動作となるため、
  // 即座に処理せず、クリックされた見出しの直上に確認ポップアップを表示する。
  // それ以外（未ソートの列への新規クリック／降順→昇順への遷移）はそのまま親のonSortClickへ委譲する。
  const handleHeaderClick = (key: SortKeyEntry['key'], event: React.MouseEvent<HTMLButtonElement>) => {
    const idx = sortKeys.findIndex((s) => s.key === key);
    if (idx !== -1 && sortKeys[idx].direction === 'asc') {
      const rect = event.currentTarget.getBoundingClientRect();
      setClearConfirmPopup({ key, top: rect.top, left: rect.left + rect.width / 2 });
      return;
    }
    onSortClick(key);
  };

  const HeaderButton = ({ label, k }: { label: string; k: SortKeyEntry['key'] }) => {
    const priorityIndex = sortKeys.findIndex((s) => s.key === k);
    const active = priorityIndex !== -1;
    return (
      <button
        type="button"
        onClick={(e) => handleHeaderClick(k, e)}
        className="flex items-center gap-1 hover:text-white transition"
      >
        {label}
        {active && (
          <span className="flex items-center gap-0.5 text-[10px]">
            <span>{sortKeys[priorityIndex].direction === 'desc' ? '▼' : '▲'}</span>
            {/* 複数列ソート時の優先順位（1=第1優先）を小さく表示 */}
            <span className="text-blue-400 font-bold">{priorityIndex + 1}</span>
          </span>
        )}
      </button>
    );
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    onReorder(next.map((i) => i.id));
  };

  // 取得単価・保有株数セルの編集開始（現在値を生の数値文字列として編集ステートへセット）
  const startEditingNumber = (
    id: string,
    field: 'acquisitionPrice' | 'acquisitionShares',
    currentValue: number | null
  ) => {
    setEditingCell({ id, field });
    setEditingValue(currentValue != null ? String(currentValue) : '');
  };

  // 取得単価・保有株数セルの編集確定（blur時）。カンマは除去してから数値変換する。
  // 空欄なら未入力(null)として保存し、正の整数以外は入力エラーとして編集前の状態に戻す。
  const commitEditingNumber = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const raw = editingValue.replace(/,/g, '').trim();

    if (raw === '') {
      onUpdateAcquisition(id, { [field]: null });
      setEditingCell(null);
      setEditingValue('');
      return;
    }

    const num = Number(raw);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      alert('半角の正の整数で入力してください');
      setEditingCell(null);
      setEditingValue('');
      return;
    }

    onUpdateAcquisition(id, { [field]: num });
    setEditingCell(null);
    setEditingValue('');
  };

  // 数値セルの表示用レンダリング（編集中はテキスト入力、それ以外はカンマ区切り表示のボタン）。
  // fullWidth=trueの場合は、カード表示（md・sm）向けに幅いっぱいのスタイルにする
  const renderNumberCell = (
    item: WatchlistItem,
    field: 'acquisitionPrice' | 'acquisitionShares',
    value: number | null,
    fullWidth = false
  ) => {
    const isEditing = editingCell?.id === item.id && editingCell.field === field;
    const widthClass = fullWidth ? 'w-full' : 'w-20';
    if (isEditing) {
      return (
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={commitEditingNumber}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setEditingCell(null);
              setEditingValue('');
            }
          }}
          className={`${widthClass} px-1.5 py-0.5 rounded bg-gray-800 border border-blue-500 text-xs font-mono text-white focus:outline-none`}
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => startEditingNumber(item.id, field, value)}
        className={`${widthClass} text-left px-1.5 py-0.5 rounded hover:bg-gray-800/60 font-mono text-xs transition`}
        title="クリックして編集"
      >
        {value != null ? value.toLocaleString() : <span className="text-gray-600">未入力</span>}
      </button>
    );
  };

  // カード表示（md・sm）向けの簡易ソートバー用に、全ソート対象キーのラベル一覧を生成
  const sortableFieldEntries = Object.entries(SORT_LABELS) as [SortKeyEntry['key'], string][];

  return (
    <>
      {/* デスクトップ表示（lg以上）：従来の表形式 */}
      <div className="hidden lg:block bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/50 text-gray-400 text-xs">
              <th className="py-3 px-2 w-8"></th>
              <th className="py-3 px-2 font-semibold">
                {/* <HeaderButton label="選択" k="selected" /> */}
                <HeaderButton label="表示" k="dashboard" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="コード" k="symbol" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="銘柄名" k="name" />
              </th>
              <th className="py-3 px-4 font-semibold border-t-5 border-t-blue-500 border-b-5 border-b-emerald-500">
                <HeaderButton label="シグナル" k="signalType" />
              </th>
              <th className="py-3 px-4 font-semibold border-t-5 border-t-blue-500 border-b-5 border-b-emerald-500">
                <HeaderButton label="発生日" k="signalDate" />
              </th>
              <th className="py-3 px-4 font-semibold border-t-5 border-t-blue-500 border-b-5 border-b-emerald-500">
                <HeaderButton label="発生価格" k="signalPrice" />
              </th>
              <th className="py-3 px-4 font-semibold border-t-5 border-t-purple-500 border-b-5 border-b-emerald-500">
                  <HeaderButton label="件数" k="profitCount" />
              </th>
              <th className="py-3 px-4 font-semibold border-t-5 border-t-purple-500 border-b-5 border-b-emerald-500">
                <HeaderButton label="勝率" k="profitWinRate" />
              </th>
              <th className="py-3 px-4 font-semibold border-t-5 border-t-purple-500 border-b-5 border-b-emerald-500">
                <HeaderButton label="合計損益" k="profitTotalProfit" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="取得単価" k="acquisitionPrice" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="保有株数" k="acquisitionShares" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="取得日" k="acquisitionDate" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="単価損益" k="unitProfit" />
              </th>
              <th className="py-3 px-4 font-semibold">
                <HeaderButton label="合計損益" k="totalProfit" />
              </th>
              <th className="py-3 px-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const hasSignal = Boolean(item.latestSignalType);
              return (
                <tr
                  key={item.id}
                  draggable={dragEnabled}
                  onDragStart={(e) => {
                    if (!dragEnabled) return;
                    // Firefox等では dataTransfer.setData を呼ばないとドラッグ自体が開始されないため必須
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                    setDragIndex(index);
                  }}
                  onDragOver={(e) => {
                    if (!dragEnabled) return;
                    e.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDrop={() => dragEnabled && handleDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`border-b border-gray-800/60 hover:bg-gray-800/30 transition ${
                    dragOverIndex === index ? 'bg-blue-900/20' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-center text-gray-600">
                    {dragEnabled ? (
                      <span className="cursor-move select-none" title="ドラッグして並べ替え">
                        ⠿
                      </span>
                    ) : (
                      <span className="text-gray-800">⠿</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.dashboardSelected}
                      onChange={(e) => onToggleSelect(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="py-2 px-4 font-mono">{item.symbol}</td>
                  <td className="py-2 px-4">{item.name}</td>
                  <td className="py-2 px-4">
                    {hasSignal ? (
                      <span
                        className={
                          item.latestSignalType === 'LONG_ENTRY'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {INTERVAL_SIGNAL_LABEL[item.latestSignalType!] ?? item.latestSignalType}
                      </span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {hasSignal && item.latestSignalDate
                      ? new Date(item.latestSignalDate).toISOString().split('T')[0]
                      : '-'}
                  </td>
                  <td className="py-2 px-4 text-gray-400">
                    {hasSignal && item.latestSignalPrice != null ? item.latestSignalPrice.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-4">{item.profitCount ?? '-'}</td>
                  <td className="py-2 px-4">
                    {item.profitWinRate != null ? `${Math.round(item.profitWinRate * 100)}%` : '-'}
                  </td>
                  <td className="py-2 px-4">
                    {item.profitTotalProfit != null ? item.profitTotalProfit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-4">
                    {renderNumberCell(item, 'acquisitionPrice', item.acquisitionPrice)}
                  </td>
                  <td className="py-2 px-4">
                    {renderNumberCell(item, 'acquisitionShares', item.acquisitionShares)}
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="date"
                      value={item.acquisitionDate ? item.acquisitionDate.slice(0, 10) : ''}
                      onChange={(e) =>
                        onUpdateAcquisition(item.id, { acquisitionDate: e.target.value || null })
                      }
                      className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500 transition [color-scheme:dark]"
                    />
                  </td>
                  <td className="py-2 px-4 font-mono">
                    {item.unitProfit != null ? item.unitProfit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-4 font-mono">
                    {item.totalProfit != null ? item.totalProfit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={16} className="py-8 text-center text-gray-600">
                  ウォッチリストは空です
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* モバイル・タブレット表示（lg未満）：カード形式 */}
    <div className="lg:hidden">
      {/* 簡易ソートバー：タップした項目でソートする（テーブルの列見出しクリックと同じ動作） */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sortableFieldEntries.map(([key, label]) => {
          const priorityIndex = sortKeys.findIndex((s) => s.key === key);
          const active = priorityIndex !== -1;
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => handleHeaderClick(key, e)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition ${
                active
                  ? 'bg-blue-600 border-blue-500 text-white font-bold'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              {label}
              {active && (
                <span className="ml-1">
                  {sortKeys[priorityIndex].direction === 'desc' ? '▼' : '▲'}
                  <span className="ml-0.5">{priorityIndex + 1}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="py-8 text-center text-gray-600 bg-gray-900 rounded-xl border border-gray-800">
          ウォッチリストは空です
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, index) => {
          const hasSignal = Boolean(item.latestSignalType);
          return (
            <div
              key={item.id}
              draggable={dragEnabled}
              onDragStart={(e) => {
                if (!dragEnabled) return;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
                setDragIndex(index);
              }}
              onDragOver={(e) => {
                if (!dragEnabled) return;
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDrop={() => dragEnabled && handleDrop(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className={`bg-gray-900 rounded-xl border p-3 shadow-lg transition ${
                dragOverIndex === index ? 'border-blue-500 bg-blue-900/10' : 'border-gray-800'
              }`}
            >
              {/* ヘッダー行：ドラッグハンドル・チェック・銘柄コード・銘柄名・削除ボタン */}
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className={`select-none text-sm ${dragEnabled ? 'cursor-move text-gray-600' : 'text-gray-800'}`}
                  title={dragEnabled ? 'ドラッグして並べ替え' : ''}
                >
                  ⠿
                </span>
                <input
                  type="checkbox"
                  checked={item.dashboardSelected}
                  onChange={(e) => onToggleSelect(item.id, e.target.checked)}
                />
                <span className="font-mono font-bold text-sm shrink-0">{item.symbol}</span>
                <span className="text-sm text-gray-300 truncate flex-1">{item.name}</span>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-xs text-gray-500 hover:text-red-400 shrink-0"
                >
                  削除
                </button>
              </div>

              {/* シグナル行 */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 pb-3 border-b border-gray-800">
                <span>
                  最新シグナル:{' '}
                  {hasSignal ? (
                    <span
                      className={item.latestSignalType === 'LONG_ENTRY' ? 'text-green-400' : 'text-red-400'}
                    >
                      {INTERVAL_SIGNAL_LABEL[item.latestSignalType!] ?? item.latestSignalType}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </span>
                {hasSignal && (
                  <>
                    <span>
                      {item.latestSignalDate ? new Date(item.latestSignalDate).toISOString().split('T')[0] : '-'}
                    </span>
                    <span>
                      {item.latestSignalPrice != null ? item.latestSignalPrice.toLocaleString() : '-'}
                    </span>
                  </>
                )}
              </div>

              {/* 保有ポジション情報：取得単価・保有株数・取得日 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">取得単価</div>
                  {renderNumberCell(item, 'acquisitionPrice', item.acquisitionPrice, true)}
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">保有株数</div>
                  {renderNumberCell(item, 'acquisitionShares', item.acquisitionShares, true)}
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1">取得日</div>
                  <input
                    type="date"
                    value={item.acquisitionDate ? item.acquisitionDate.slice(0, 10) : ''}
                    onChange={(e) =>
                      onUpdateAcquisition(item.id, { acquisitionDate: e.target.value || null })
                    }
                    className="w-full px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500 transition [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* 損益・集計情報：単価損益・損益合計・件数・勝率・合計損益 */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">単価損益</div>
                  <div className="font-mono">
                    {item.unitProfit != null ? item.unitProfit.toLocaleString() : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">損益合計</div>
                  <div className="font-mono">
                    {item.totalProfit != null ? item.totalProfit.toLocaleString() : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">合計損益</div>
                  <div className="font-mono">
                    {item.profitTotalProfit != null ? item.profitTotalProfit.toLocaleString() : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">件数</div>
                  <div>{item.profitCount ?? '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">勝率</div>
                  <div>{item.profitWinRate != null ? `${Math.round(item.profitWinRate * 100)}%` : '-'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ソート解除確認ポップアップ（クリックした列見出しの直上に表示する） */}
    {clearConfirmPopup && (
      <>
        {/* 背景クリックで閉じるための透明オーバーレイ */}
        <div className="fixed inset-0 z-40" onClick={() => setClearConfirmPopup(null)} />
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-3 text-xs text-white w-60"
          style={{ top: clearConfirmPopup.top - 10, left: clearConfirmPopup.left }}
        >
          <p className="mb-2 leading-relaxed">
            「{SORT_LABELS[clearConfirmPopup.key]}」のソートを解除しますか？
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onSortClearCancel(clearConfirmPopup.key);
                setClearConfirmPopup(null);
              }}
              className="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1"
            >
              いいえ
            </button>
            <button
              onClick={() => {
                onSortClearConfirm(clearConfirmPopup.key);
                setClearConfirmPopup(null);
              }}
              className="bg-blue-600 hover:bg-blue-500 rounded px-3 py-1"
            >
              はい
            </button>
          </div>
          {/* 吹き出しの三角（見出しの真上を指す） */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-gray-800 border-r border-b border-gray-700 rotate-45" />
        </div>
      </>
    )}
    </>
  );
}
