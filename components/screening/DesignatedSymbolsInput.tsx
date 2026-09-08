'use client';

import { useState, useEffect, useRef } from 'react';
import { MAX_DESIGNATED_SYMBOLS } from './constants';

interface Candidate {
  symbol: string; // "7203.T" 形式
  name: string;
}

interface DesignatedSymbol {
  symbol: string; // 4桁コード
  name: string;
}

interface Props {
  value: DesignatedSymbol[];
  onChange: (value: DesignatedSymbol[]) => void;
}

/******************************************************************
 指定銘柄の設定コンポーネント
 トリガー実行前にユーザーが最大20件まで銘柄を設定する（E4の決定事項）
 ******************************************************************/
export default function DesignatedSymbolsInput({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbol-lookup?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        // 東証銘柄（.T サフィックス）のみを候補として表示
        setCandidates((data.quotes || []).filter((q: Candidate) => q.symbol.endsWith('.T')));
      } catch {
        setCandidates([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addSymbol = (c: Candidate) => {
    const code4 = c.symbol.replace(/\.T$/, '');
    if (value.some((v) => v.symbol === code4)) return;
    if (value.length >= MAX_DESIGNATED_SYMBOLS) return;
    onChange([...value, { symbol: code4, name: c.name }]);
    setQuery('');
    setCandidates([]);
  };

  const removeSymbol = (code4: string) => {
    onChange(value.filter((v) => v.symbol !== code4));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">指定銘柄</h3>
        <span className="text-xs text-gray-500">
          {value.length} / {MAX_DESIGNATED_SYMBOLS}件
        </span>
      </div>

      <div className="relative max-w-sm">
        <input
          type="text"
          value={query}
          disabled={value.length >= MAX_DESIGNATED_SYMBOLS}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            value.length >= MAX_DESIGNATED_SYMBOLS
              ? '上限に達しています'
              : '銘柄コード・銘柄名で検索'
          }
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        {candidates.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-56 overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.symbol}>
                <button
                  type="button"
                  onClick={() => addSymbol(c)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 flex justify-between gap-2"
                >
                  <span className="text-gray-100">{c.name}</span>
                  <span className="text-gray-500">{c.symbol}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <li
              key={v.symbol}
              className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full pl-3 pr-1.5 py-1 text-xs text-gray-200"
            >
              <span>
                {v.name} ({v.symbol})
              </span>
              <button
                type="button"
                onClick={() => removeSymbol(v.symbol)}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400"
                aria-label={`${v.symbol}を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
