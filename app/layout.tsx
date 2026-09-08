// グローバルスタイルシート（CSS）をインポートする
import './globals.css';

// Next.js の Metadata 型をインポートする
import type { Metadata } from 'next';

// NextAuth のセッションプロバイダーコンポーネントをインポートする
import NextAuthProvider from '@/components/providers/NextAuthProvider';

/******************************************************************
アプリケーション全体の共通メタデータオブジェクトを定義
ブラウザのタブタイトルや SEO 関連のメタ情報として利用されます
******************************************************************/
export const metadata: Metadata = {
  // Web アプリケーションのタイトルを設定
  title: 'Turtle Trading System',

  // Web アプリケーションの概要説明文を設定
  description: 'Turtle Trading Rules Analysis and Signal Scanner',
};

/******************************************************************
アプリケーション全体のルートレイアウトを定義するコンポーネント
すべてのページコンポーネントをラップし、共通の HTML 構造や
認証プロバイダー（NextAuthProvider）を提供します
******************************************************************/
export default function RootLayout({
  // 子コンポーネントを受け取る Props の定義
  children,
}: {
  // 受け取る子要素の型として React.ReactNode を指定
  children: React.ReactNode;
}) {
  // ルート HTML 構造をレンダリングして返す
  return (
    // HTML 要素の言語を日本語（ja）に設定し、Tailwind のダークモードクラス（dark）を適用
    <html lang="ja" className="dark">
      {/* body タグに背景色（暗いグレー）、文字色（明るいグレー）、フォントスムーズ化、最小高さを設定 */}
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        {/* NextAuth のセッション情報をアプリ全域で参照可能にするためのプロバイダーでラップ */}
        <NextAuthProvider>
          {/* 各ページコンポーネント（子要素）をレンダリングして表示 */}
          {children}
        {/* セッションプロバイダーの終了 */}
        </NextAuthProvider>
      {/* body タグの終了 */}
      </body>
    {/* html タグの終了 */}
    </html>
  );
}
