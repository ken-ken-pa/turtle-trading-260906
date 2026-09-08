'use client';

interface Props {
  status: string;
  phase1Total: number;
  phase1Processed: number;
  phase2Total: number;
  phase2Processed: number;
  pollIntervalMs: number;
  skippedCount: number;
}

function formatEta(remaining: number, intervalMs: number): string {
  const totalSeconds = Math.ceil((remaining * intervalMs) / 1000);
  if (totalSeconds < 60) return `約${totalSeconds}秒`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `約${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `約${hours}時間${remMinutes}分`;
}

/******************************************************************
 進捗表示パネル
 D2の決定事項: 簡易的でよい。動作中であることと簡易的な進捗が分かることを優先する。
 ******************************************************************/
export default function ProgressPanel({
  status,
  phase1Total,
  phase1Processed,
  phase2Total,
  phase2Processed,
  pollIntervalMs,
  skippedCount,
}: Props) {
  const isPhase1 = status === 'PHASE1_RUNNING';
  const isPhase2 = status === 'PHASE2_RUNNING';

  const processed = isPhase1 ? phase1Processed : phase2Processed;
  const total = isPhase1 ? phase1Total : phase2Total;
  const remaining = Math.max(0, total - processed);
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div>
          <p className="text-sm font-semibold text-gray-100">
            {isPhase1 ? '銘柄を調査中です（Phase1: 指標絞り込み）' : '銘柄を調査中です（Phase2: Long Profit集計）'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">画面を開いたままお待ちください</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>
            処理済み {processed} / {total} 銘柄
          </span>
          <span>{percent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span>推定残り時間: {formatEta(remaining, pollIntervalMs)}</span>
        {skippedCount > 0 && <span className="text-amber-500">スキップ: {skippedCount}銘柄</span>}
        {isPhase1 && phase2Total === 0 && (
          <span>Phase1完了後、Phase2（Long Profit集計）の件数が確定します</span>
        )}
      </div>
    </div>
  );
}
