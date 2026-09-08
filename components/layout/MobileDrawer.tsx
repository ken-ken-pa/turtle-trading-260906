// クライアントコンポーネントであることを宣言
'use client';

// ReactからuseState・useEffect・useRef・ReactNodeをインポート
import { useState, useEffect, useRef } from 'react';
// ReactDOMのcreatePortalをインポート（body直下に描画してスタッキングコンテキスト問題を回避）
import { createPortal } from 'react-dom';

// MobileDrawerコンポーネントのPropsインターフェース定義
interface MobileDrawerProps {
  // ドロワーの内容（ReactNode）
  children: React.ReactNode;
}

// 汎用モバイルドロワーコンポーネント（ハンバーガーボタン＋スライドドロワー）
export default function MobileDrawer({ children }: MobileDrawerProps) {
  // ドロワー開閉状態
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // SSR/クライアント初期化完了フラグ（createPortalはクライアントのみ使用可能）
  const [isMounted, setIsMounted] = useState<boolean>(false);
  // ドロワーパネルのDOM参照（将来の外側クリック検知拡張用）
  const drawerRef = useRef<HTMLDivElement>(null);

  // クライアントサイドでのみマウント完了フラグを立てる
  useEffect(() => {
    // マウント完了を記録（createPortal使用の前提条件）
    setIsMounted(true);
  }, []);

  // ESCキーでドロワーを閉じる処理
  useEffect(() => {
    // キーダウンイベントハンドラー
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESCキーが押された場合に閉じる
      if (e.key === 'Escape') setIsOpen(false);
    };
    // イベントリスナーを登録
    document.addEventListener('keydown', handleKeyDown);
    // クリーンアップ時にリスナーを解除
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ドロワーが開いている間はbodyのスクロールを無効化
  useEffect(() => {
    // 開状態でoverflow-hiddenを付与し、スクロールを防止
    document.body.style.overflow = isOpen ? 'hidden' : '';
    // クリーンアップ時にスタイルをリセット
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ドロワーのJSXを返却
  return (
    <>
      {/* ハンバーガーボタン（lg以上では非表示） */}
      <button
        type="button"
        aria-label="メニューを開く"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition gap-1.5"
      >
        {/* ハンバーガーアイコン上段 */}
        <span className="block w-5 h-0.5 bg-slate-300 rounded" />
        {/* ハンバーガーアイコン中段 */}
        <span className="block w-5 h-0.5 bg-slate-300 rounded" />
        {/* ハンバーガーアイコン下段 */}
        <span className="block w-5 h-0.5 bg-slate-300 rounded" />
      </button>

      {/* スライドアニメーション定義（常にDOMに存在させる） */}
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/*
        ドロワー本体をcreatePortalでdocument.body直下に描画する。
        理由：Navbarの backdrop-blur（backdrop-filter）がスタッキングコンテキストを
        生成するため、Navbar内部の fixed 要素がチャートより下に描画される問題が発生する。
        Portalで body 直下に出すことで、すべての親要素のスタッキングコンテキストを
        回避し、z-index が確実に最上位に適用される。
      */}
      {isMounted && isOpen && createPortal(
        <>
          {/* 背景オーバーレイ（クリックで閉じる） */}
          <div
            className="fixed inset-0 bg-black/60 z-[9998]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* ドロワーパネル本体（右からスライド） */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="メニュー"
            className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-[#0B0F19] border-l border-slate-800 shadow-2xl z-[9999] flex flex-col"
            style={{ animation: 'slideInFromRight 0.22s ease-out' }}
          >
            {/* ドロワーヘッダー（閉じるボタン） */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              {/* タイトル */}
              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                {/* 亀アイコン */}
                <span className="text-lg">🐢</span>
                メニュー
              </span>
              {/* 閉じるボタン */}
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* ドロワーコンテンツ（スクロール可能） */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {children}
            </div>
          </div>
        </>,
        // body 直下にportalとして描画
        document.body
      )}
    </>
  );
}
