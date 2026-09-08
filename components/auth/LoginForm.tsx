// クライアントサイドコンポーネントとして宣言（ブラウザ側でステートやイベントを処理する）
'use client';

// ReactからState（状態管理）とEffect（副作用・初期処理）フックをインポート
import { useState, useEffect } from 'react';
// NextAuthからログイン実行用関数（signIn）をインポート
import { signIn } from 'next-auth/react';
// Next.jsの高速なページ間遷移を実現するLinkコンポーネントをインポート
import Link from 'next/link';

/******************************************************************
 ログインフォームコンポーネント
 メールアドレス・パスワード認証およびGoogle OAuthログインを提供します。
 また、新規ユーザー登録の可否を判定し動的なUI制御を行います。
 ******************************************************************/
export default function LoginForm() {
  // メールアドレス入力値を管理するステート（初期値: 空文字）
  const [email, setEmail] = useState('');

  // パスワード入力値を管理するステート（初期値: 空文字）
  const [password, setPassword] = useState('');

  // エラー発生時のメッセージを管理するステート（初期値: 空文字）
  const [error, setError] = useState('');

  // ログイン処理中のローディング状態を管理するステート（初期値: false）
  const [isLoading, setIsLoading] = useState(false);

  // 新規登録の許可状態を管理するステート（初期値: true で楽観的表示）
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(true);

  // 登録停止中にリンクが押された際／Googleサインインが拒否された際の
  // 注意文表示フラグ（初期値: false）
  const [showRegistrationDisabledNotice, setShowRegistrationDisabledNotice] = useState(false);

  // コンポーネントの初回マウント時に新規登録の許可ステータスを取得する
  useEffect(() => {
    // APIから新規登録許可状態を取得する非同期関数
    const fetchRegistrationStatus = async () => {
      // 例外処理の開始
      try {
        // 登録ステータス確認用APIへフェッチリクエストを送信
        const res = await fetch('/api/register');

        // レスポンスをJSON形式に変換
        const data = await res.json();

        // allowedプロパティがブール値として存在する場合、ステートを更新
        if (typeof data.allowed === 'boolean') {
          // 取得した許可フラグをステートに反映
          setIsRegistrationAllowed(data.allowed);
        }
      // エラー発生時の処理
      } catch (err) {
        // ステータス取得に失敗した場合はログを出力（ステートはデフォルト値のtrueを維持）
        console.error('Failed to fetch registration status:', err);
      }
    };

    // 定義した非同期関数を実行
    fetchRegistrationStatus();
  }, []); // 依存配列が空のため初回レンダリング時のみ実行

  // Googleサインインが新規登録停止により拒否された場合の検知処理
  // NextAuthのsignInコールバックがfalseを返すと、このページへ
  // "?error=AccessDenied" 付きでリダイレクトされてくるため、
  // URLクエリパラメータを確認して該当する場合は注意文を表示する。
  useEffect(() => {
    // ブラウザ環境でのみ実行（SSR時のwindow未定義エラーを回避）
    if (typeof window === 'undefined') return;

    // 現在のURLからクエリパラメータを取得
    const params = new URLSearchParams(window.location.search);

    // NextAuthの拒否時エラーコードかどうかを判定
    if (params.get('error') === 'AccessDenied') {
      // 新規登録停止の注意文を表示するフラグを有効化
      setShowRegistrationDisabledNotice(true);
    }
  }, []); // 依存配列が空のため初回レンダリング時のみ実行

  /******************************************************************
   「新規アカウント作成」リンククリック時のイベントハンドラー
   新規登録が不可能な場合、ページ遷移をキャンセルして案内メッセージを表示します
   ******************************************************************/
  const handleRegisterLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 登録が許可されていない場合の判定
    if (!isRegistrationAllowed) {
      // <Link>標準のページ遷移動作をキャンセル
      e.preventDefault();

      // 停止中の注意テキストを表示するフラグを有効化
      setShowRegistrationDisabledNotice(true);
    }
  };

  /******************************************************************
   メール/パスワードフォーム送信時のハンドラー
   NextAuthのCredentials認証を呼び出し、成功時はダッシュボードへ遷移します
   ******************************************************************/
  const handleSubmit = async (e: React.FormEvent) => {
    // ブラウザ標準のフォーム送信・画面リロード動作を防止
    e.preventDefault();

    // 以前のエラー表示をクリア
    setError('');

    // ボタンの重層クリックを防ぐためローディング状態を有効化
    setIsLoading(true);

    // 認証処理を実行
    try {
      // NextAuthのsignIn関数を実行（Credentialsプロバイダーを使用）
      const res = await signIn('credentials', {
        email, // メールアドレス
        password, // パスワード
        redirect: false, // エラーハンドリングのため自動リダイレクトをオフに設定
      });

      // 認証応答にエラーが含まれるか判定
      if (res?.error) {
        // ユーザー向けのエラーメッセージを設定
        setError('メールアドレスまたはパスワードが正しくありません');
      // 認証成功時
      } else {
        // ダッシュボードページへ遷移
        // ※ router.push（クライアント側遷移）だと、ログインCookieの確定タイミングと
        //   競合し、遷移直後のダッシュボード側の設定取得APIが未認証状態のまま実行され、
        //   保存済みの画面分割・銘柄数・期間・足などがデフォルト値に戻って見える場合がある。
        //   window.location.href によるフルページ遷移で、Cookie確定後に
        //   ダッシュボードを新規リクエストさせることで、この競合を防止する。
        window.location.href = '/watchlist';
      }
    // 予期せぬ例外の捕捉
    } catch (err) {
      // システムエラー用のメッセージを設定
      setError('ログイン処理中にエラーが発生しました');
    // 成功・失敗に関わらず必ず実行する後処理
    } finally {
      // ローディング状態を解除
      setIsLoading(false);
    }
  };

  /******************************************************************
   Google OAuthログイン用ボタンのクリックハンドラー
   NextAuth経由でGoogle認証を実行します
   （新規登録が停止中の場合にサインインが拒否されると、NextAuthにより
   このページへ ?error=AccessDenied 付きで自動的に戻される）
   ******************************************************************/
  const handleGoogleSignIn = () => {
    // Googleプロバイダーによるサインインを実行（成功後の遷移先にウォッチリスト＝260906の新しい起点を指定）
    signIn('google', { callbackUrl: '/watchlist' });
  };

  // UIをレンダリングして返却
  return (
    // 最外層：画面全体の中央にカードを配置するレスポンシブコンテナ
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070A10] text-slate-100 p-4">
      {/* ログインフォーム全体のカード型枠組み */}
      <div className="w-full max-w-md bg-[#0B0F19] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* ヘッダーエリア（ロゴ・アプリ名・説明文） */}
        <div className="text-center space-y-2">
          {/* ブランドロゴ（アイコン表示枠） */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-3xl mb-2 shadow-inner">
            🐢
          </div>
          {/* メインタイトル */}
          <h1 className="text-2xl font-black tracking-wider text-white">TURTLE TRADING</h1>
          {/* サブタイトル */}
          <p className="text-xs text-slate-400">アカウントにログインしてチャート分析を開始してください</p>
        </div>

        {/* 認証エラー時の警告表示エリア（エラー時のみレンダリング） */}
        {error && (
          // エラーメッセージの赤枠バナー
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
            {/* エラー内容を表示 */}
            {error}
          </div>
        )}

        {/* ログイン入力フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メールアドレス入力項目 */}
          <div className="space-y-1">
            {/* 入力ラベル */}
            <label className="text-xs font-bold text-slate-300">メールアドレス</label>
            {/* メールアドレス用テキストインプット */}
            <input
              type="email" // メール形式の入力バリデーション
              required // 必須項目設定
              value={email} // ステートと同期
              onChange={(e) => setEmail(e.target.value)} // 入力変更時にステート更新
              placeholder="example@turtle.com" // プレースホルダー
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* パスワード入力項目 */}
          <div className="space-y-1">
            {/* 入力ラベル */}
            <label className="text-xs font-bold text-slate-300">パスワード</label>
            {/* パスワード用インプット（非表示形式） */}
            <input
              type="password" // マスク処理
              required // 必須項目設定
              value={password} // ステートと同期
              onChange={(e) => setPassword(e.target.value)} // 入力変更時にステート更新
              placeholder="••••••••" // プレースホルダー
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* ログイン実行ボタン */}
          <button
            type="submit" // フォーム送信タイプ
            disabled={isLoading} // ローディング時はボタン無効化
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/20 transition disabled:opacity-50"
          >
            {/* ローディング状態に応じたボタンラベルの動的切り替え */}
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* 区切り線（または/OR表示） */}
        <div className="relative flex items-center justify-center my-4">
          {/* 背景の水平線 */}
          <div className="border-t border-slate-800 w-full"></div>
          {/* 中央のテキストバッジ */}
          <span className="bg-[#0B0F19] px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest absolute">または</span>
        </div>

        {/* Google認証ボタン */}
        <button
          type="button" // フォーム送信を行わない通常のボタンタイプ
          onClick={handleGoogleSignIn} // クリックでGoogleサインイン実行
          className="w-full py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-3 transition shadow-sm"
        >
          {/* GoogleブランドマークSVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            {/* 赤色パス */}
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            {/* 青色パス */}
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            {/* 黄色パス */}
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
            />
            {/* 緑色パス */}
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
            />
          </svg>
          {/* ボタンのテキストラベル */}
          Google でログイン
        </button>

        {/* 新規登録案内フッター */}
        <div className="text-center pt-2">
          {/* 案内文 */}
          <p className="text-xs text-slate-400">
            アカウントをお持ちでないですか？{' '}
            {/* 新規登録ページへのリンク（制御ハンドラー付き） */}
            <Link href="/register" onClick={handleRegisterLinkClick} className="text-blue-400 font-bold hover:underline">
              新規アカウント作成
            </Link>
          </p>
          {/* 新規登録停止中の場合に表示する警告通知メッセージ */}
          {showRegistrationDisabledNotice && (
            <p className="mt-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              現在、新規ユーザー登録は停止しています。
            </p>
          )}
        </div>

      </div>
    </div>
  );
}