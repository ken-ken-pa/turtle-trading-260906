// クライアントコンポーネントであることを宣言
'use client';

// Next.js の Link コンポーネントをインポート
import Link from 'next/link';
// 現在のパスを取得するフックをインポート
import { usePathname } from 'next/navigation';
// NextAuthのフックおよびsignOut関数をインポート
import { useSession, signOut } from 'next-auth/react';
// 汎用モバイルドロワーコンポーネントをインポート
import MobileDrawer from '@/components/layout/MobileDrawer';

// ナビゲーションバーコンポーネントのPropsインターフェース定義
export interface NavbarProps {
  // モバイルドロワーに追加で表示するコンテンツ（省略可能）
  mobileMenuContent?: React.ReactNode;
}

// ナビゲーションバーコンポーネントを定義
export default function Navbar({ mobileMenuContent }: NavbarProps) {
  // 現在のパス名を取得
  const pathname = usePathname();
  // NextAuthのセッション状態を取得
  const { data: session } = useSession();

  // ナビゲーションバーのJSXを返却
  return (
    // 上部固定のナビゲーションバー
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
      {/* 最大幅を制限したコンテナ */}
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* 左側のロゴとリンク群 */}
        <div className="flex items-center gap-6">
          {/* ロゴおよびダッシュボードへのリンク */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white tracking-wider text-base">
            {/* 亀の絵文字 */}
            <span className="text-xl">🐢</span>
            {/* アプリ名 */}
            <span>TURTLE TRADING</span>
          </Link>
          {/* ナビゲーションリンクエリア（lg以上のみ表示） */}
          <div className="hidden lg:flex gap-1 text-sm">
            {/* ダッシュボードページへのリンク */}
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition ${
                pathname.startsWith('/dashboard')
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              ダッシュボード
            </Link>
            {/* ウォッチリスト管理ページへのリンク */}
            <Link
              href="/watchlist"
              className={`px-3 py-1.5 rounded-lg transition ${
                pathname === '/watchlist'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              ウォッチリスト
            </Link>
          </div>
        </div>

        {/* 右側エリア */}
        <div className="flex items-center gap-3">
          {/* デスクトップ用ユーザー表示・ログアウトエリア（lg以上のみ表示） */}
          <div className="hidden lg:flex items-center gap-4">
            {/* セッションが存在する（ログイン中）場合 */}
            {session?.user ? (
              // ログインユーザーコンテナ
              <div className="flex items-center gap-3">
                {/* ユーザー情報表示 */}
                <div className="text-right">
                  {/* ユーザー名またはメールアドレス */}
                  <div className="text-xs font-bold text-slate-200">
                    {session.user.name || session.user.email?.split('@')[0]}
                  </div>
                  {/* メールアドレス */}
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    {session.user.email}
                  </div>
                </div>
                {/* ログアウトボタン */}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition shadow"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              // ログアウト状態の場合のログインボタン
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition"
              >
                ログイン
              </Link>
            )}
          </div>

          {/* モバイル用ハンバーガーメニュー（lg未満で表示） */}
          <MobileDrawer>
            {/* ナビゲーションリンクセクション */}
            <div className="space-y-1">
              {/* セクションラベル */}
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">
                ナビゲーション
              </div>
              {/* ダッシュボードリンク */}
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {/* アイコン */}
                <span>📊</span>
                ダッシュボード
              </Link>
              {/* ウォッチリストリンク */}
              <Link
                href="/watchlist"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                  pathname === '/watchlist'
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {/* アイコン */}
                <span>📋</span>
                ウォッチリスト
              </Link>
            </div>

            {/* 追加コンテンツ（ページ固有のコントロール群） */}
            {mobileMenuContent}

            {/* アカウントセクション */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              {/* セクションラベル */}
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">
                アカウント
              </div>
              {session?.user ? (
                <>
                  {/* ユーザー情報表示 */}
                  <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    {/* ユーザー名 */}
                    <div className="text-xs font-bold text-slate-200">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </div>
                    {/* メールアドレス */}
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {session.user.email}
                    </div>
                  </div>
                  {/* ログアウトボタン */}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm font-bold bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition text-left flex items-center gap-2"
                  >
                    {/* アイコン */}
                    <span>🚪</span>
                    ログアウト
                  </button>
                </>
              ) : (
                // ログインリンク
                <Link
                  href="/login"
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
                >
                  {/* アイコン */}
                  <span>🔑</span>
                  ログイン
                </Link>
              )}
            </div>
          </MobileDrawer>
        </div>

      </div>
    </nav>
  );
}