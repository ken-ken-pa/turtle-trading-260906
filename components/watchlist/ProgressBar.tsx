'use client';

import { BatchJob } from './types';

interface ProgressBarProps {
  job: BatchJob;
}

const LABELS: Record<BatchJob['type'], string> = {
  SIGNAL_FETCH: '最新シグナル取得',
  PROFIT_AGGREGATION: 'Long Profit集計取得',
};

export default function ProgressBar({ job }: ProgressBarProps) {
  const percent = job.totalCount > 0 ? Math.round((job.processedCount / job.totalCount) * 100) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 mb-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{LABELS[job.type]}実行中...</span>
        <span>
          {job.processedCount} / {job.totalCount} 件
          {job.errorCount > 0 && <span className="text-yellow-500 ml-2">(スキップ{job.errorCount}件)</span>}
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
