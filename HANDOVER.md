# 🐢 Turtle Trading System - システム構築・運用引き継ぎ書

本ドキュメントは、**Turtle Trading System（タートル・トレーディング分析システム）** を初見のエンジニア/ユーザーがゼロから理解し、完全に同じ動作環境を再構築・保守運用できるようにまとめた引き継ぎ書です。  
**※掲載されているすべてのコードにおいて、各行の直上に簡潔な説明コメントを付与しています。**

---

## 1. システム概要 & アーキテクチャ

### 1.1 システムの目的

本システムは、伝説的な投資集団「タートルズ」のブレイクアウト戦略（20日高値更新でのエントリー、10日安値更新での手仕舞い、2ATR幅での損切りストップライン）を日本株・米国株等に適用し、ビジュアルチャート分析および自動売買シグナル検知・通知を行うシステムです。

### 1.2 主な機能

- **ユーザー認証・ログイン保護 (`/login`, `/register`, `middleware.ts`)**:
  - メールアドレス＆パスワード認証（bcryptハッシュ化） + Googleアカウント連携（OAuth）
  - 未認証アクセス時は自動的に `/login` 画面へリダイレクト保護
  - 画面上部ナビゲーションバーにユーザー名/メール表示および「ログアウト」機能
- **ユーザー別チャート表示のDB保存・復元機能 (`/api/user/settings`)**:
  - ログインユーザーごとに画面分割数、表示期間、足種別をデータベース（Prisma `UserSetting`）に自動永続化
- **マルチ画面トレーディング・ダッシュボード (`/dashboard`)**:
  - 1画面〜16画面のマルチチャート切り替え（TradingViewライクな分析体験）
  - 日足 / 週足 / 月足 の切替、表示期間（1か月〜最長）の動的切替
  - 銘柄コード（例: `8035.T`）または企業名（例: `東京エレクトロン`）のサジェスト検索
  - lightweight-charts による高速・インタラクティブなチャート表示
- **ウォッチリスト管理画面 (`/watchlist`)**:
  - 監視対象銘柄の登録・削除
  - Yahoo Finance APIと連携したリアルタイム検索・自動補完

---

## 2. 認証・設定同期の主要ソースコード（全行コメント付き）

### 2.1 ログイン画面 (`app/login/page.tsx`)

```tsx
// クライアントサイドコンポーネントとして宣言
'use client';

// Reactのフックをインポート
import { useState } from 'react';
// NextAuthのsignInフックをインポート
import { signIn } from 'next-auth/react';
// Next.jsのルーターとLinkをインポート
import { useRouter } from 'next/navigation';
// Linkコンポーネントをインポート
import Link from 'next/link';

// ログインページコンポーネントを定義
export default function LoginPage() {
  // ルーターインスタンスを取得
  const router = useRouter();
  // メールアドレス入力ステート
  const [email, setEmail] = useState('');
  // パスワード入力ステート
  const [password, setPassword] = useState('');
  // エラーメッセージ表示ステート
  const [error, setError] = useState('');
  // 処理中（ローディング）ステート
  const [isLoading, setIsLoading] = useState(false);

  // メール/パスワードによるログインフォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    // フォームデフォルト送信動作を防止
    e.preventDefault();
    // エラー表示をクリア
    setError('');
    // ローディング表示を有効化
    setIsLoading(true);

    try {
      // NextAuthのsignIn関数を実行
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuthログインハンドラー
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070A10] text-slate-100 p-4">
      <div className="w-full max-w-md bg-[#0B0F19] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-3xl mb-2 shadow-inner">
            🐢
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">TURTLE TRADING</h1>
          <p className="text-xs text-slate-400">アカウントにログインしてチャート分析を開始してください</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@turtle.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/20 transition disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-[#0B0F19] px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest absolute">または</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-3 transition shadow-sm"
        >
          Google でログイン
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            アカウントをお持ちでないですか？{' '}
            <Link href="/register" className="text-blue-400 font-bold hover:underline">
              新規アカウント作成
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

以上が最新の引き継ぎ情報となります。
