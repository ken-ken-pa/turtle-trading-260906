'use client';

import { useState, useRef, useEffect } from 'react';

interface SymbolCandidate {
  symbol: string;
  name: string;
  exchange: string;
}

interface AddSymbolInputProps {
  onAdd: (symbol: string, name: string) => void;
}

// 既存 /api/symbol-lookup（Yahoo Finance検索）を利用した銘柄追加コンポーネント
export default function AddSymbolInput({ onAdd }: AddSymbolInputProps) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<SymbolCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbol-lookup?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setCandidates(data.quotes ?? []);
        setOpen(true);
      } catch {
        setCandidates([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (candidate: SymbolCandidate) => {
    // Yahooティッカー形式（例: "7203.T"）から4桁コード部分のみを取り出す
    const code = candidate.symbol.replace(/\.T$/i, '');
    onAdd(code, candidate.name);
    setQuery('');
    setCandidates([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="銘柄コード・銘柄名で検索して追加"
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-64"
      />
      {open && candidates.length > 0 && (
        <ul className="absolute z-10 mt-1 w-72 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-64 overflow-y-auto">
          {candidates.map((c) => (
            <li key={c.symbol}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex justify-between"
              >
                <span>
                  {c.symbol} {c.name}
                </span>
                <span className="text-gray-500 text-xs">{c.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
