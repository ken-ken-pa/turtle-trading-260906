'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';

// 日経225構成銘柄マスタを手動投入するための簡易管理画面。
// データ元は「日経平均プロフィル」の構成銘柄一覧ページ等を参照し、
// symbol,name,sector 形式のCSV（ヘッダー行必須）を貼り付けて反映する。
// 銘柄入れ替えは年2回程度のため、専用UIは最小限の作りにしている。
export default function Nikkei225AdminPage() {
  const [csv, setCsv] = useState('symbol,name,sector\n7203,トヨタ自動車,輸送用機器\n');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/import-nikkei225', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '取込に失敗しました');
      } else {
        setResult(
          `取込完了: ${data.upsertedCount}件登録（取込前: ${data.removedCount}件）${
            data.warning ? `／注意: ${data.warning}` : ''
          }`
        );
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-2">日経225マスタ投入(管理用)</h1>
        <p className="text-sm text-gray-400 mb-4">
          「日経平均プロフィル」の構成銘柄一覧等を参照し、<code>symbol,name,sector</code>
          形式のCSV(ヘッダー行必須、カンマ区切り、UTF-8)を貼り付けて反映してください。反映すると既存の日経225マスタは全件洗い替えされます。
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={16}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono"
          placeholder={'symbol,name,sector\n7203,トヨタ自動車,輸送用機器\n...'}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded px-4 py-2 text-sm"
        >
          {loading ? '取込中...' : '取込を実行'}
        </button>

        {result && <p className="mt-3 text-sm text-green-400">{result}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
