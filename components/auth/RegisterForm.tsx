// クライアントサイドコンポーネントとして宣言（ブラウザ側で実行される）
'use client';

// Reactフック（状態管理と副作用処理）をインポート
import { useState, useEffect } from 'react';
// NextAuthのログイン処理用関数をインポート
import { signIn } from 'next-auth/react';
// Next.js App Router用のルーターフックをインポート
import { useRouter } from 'next/navigation';
// クライアントサイド遷移用のLinkコンポーネントをインポート
import Link from 'next/link';

/******************************************************************
 新規ユーザー登録フォームコンポーネント
 入力フォームの状態管理、登録可否の初期チェック、
 APIへのデータ送信および登録後の自動ログインと画面遷移を制御します
 ******************************************************************/
export default function RegisterForm() {
  // 画面遷移を実行するためのルーターインスタンスを取得
  const router = useRouter();

  // お名前入力値を保持するステート（初期値：空文字）
  const [name, setName] = useState('');

  // メールアドレス入力値を保持するステート（初期値：空文字）
  const [email, setEmail] = useState('');

  // パスワード入力値を保持するステート（初期値：空文字）
  const [password, setPassword] = useState('');

  // エラーメッセージ文字列を保持するステート（初期値：空文字）
  const [error, setError] = useState('');

  // API通信中のローディング状態を保持するステート（初期値：false）
  const [isLoading, setIsLoading] = useState(false);

  // 新規登録機能が有効かどうかのステート（初期値：null = 確認中）
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean | null>(null);

  /******************************************************************
   初回レンダリング時にサーバーから新規登録の許可状態を取得する処理
   ******************************************************************/
  useEffect(() => {
    // 登録ステータスを取得する非同期関数
    const fetchRegistrationStatus = async () => {
      // 例外処理ブロックを開始
      try {
        // GETリクエストで登録可否設定を取得
        const res = await fetch('/api/register');
        // レスポンスをJSONに変換
        const data = await res.json();
        // allowedプロパティが boolean 型であればステートに設定
        if (typeof data.allowed === 'boolean') setIsRegistrationAllowed(data.allowed);
      // 通信エラー時の処理
      } catch (err) {
        // エラーログを出力
        console.error('Failed to fetch registration status:', err);
        // 取得失敗時はデフォルトで登録フォームを表示許可（最終判定はPOST送信時にサーバーで行う）
        setIsRegistrationAllowed(true);
      }
    };
    // ステータス取得処理を実行
    fetchRegistrationStatus();
  }, []); // 依存配列が空のためマウント時に1度だけ実行

  /******************************************************************
   アカウント作成フォーム送信時のハンドラー関数
   ******************************************************************/
  const handleSubmit = async (e: React.FormEvent) => {
    // フォーム送信によるデフォルトのページリロードを停止
    e.preventDefault();
    // 以前のエラー表示をクリア
    setError('');
    // ボタンの非活性化とローディング表示を有効化
    setIsLoading(true);

    // 例外処理ブロックの開始
    try {
      // API(/api/register)へ新規登録POSTリクエストを送信
      const res = await fetch('/api/register', {
        method: 'POST', // HTTPメソッドにPOSTを指定
        headers: { 'Content-Type': 'application/json' }, // 送信フォーマットをJSONに設定
        body: JSON.stringify({ name, email, password }), // 送信データをJSON文字列化
      });

      // レスポンスボディをJSONとして解析
      const data = await res.json();

      // ステータスコードがOK（200番台）でない場合
      if (!res.ok) {
        // サーバーからのエラーメッセージ（またはデフォルト文字列）をステートに設定
        setError(data.error || 'アカウント作成に失敗しました');
        // 処理を中断
        return;
      }

      // アカウント作成成功後、そのままログイン処理を実行
      const signInRes = await signIn('credentials', {
        email, // 登録したメールアドレス
        password, // 登録したパスワード
        redirect: false, // 自動リダイレクトを無効化して結果を受け取る
      });

      // ログインが成功した場合
      if (signInRes?.ok) {
        // ウォッチリスト画面（260906の新しい起点）へリダイレクト
        router.push('/watchlist');
        // ルートのデータをリフレッシュして最新化
        router.refresh();

      // ログインに失敗した場合
      } else {
        // 手動ログイン画面へリダイレクト
        router.push('/login');
      }

    // 例外発生時（ネットワークエラーなど）
    } catch (err) {
      // 画面上に汎用エラーメッセージを設定
      setError('アカウント作成処理中にエラーが発生しました');

    // 成功・失敗に関わらず最終的に必ず実行されるブロック
    } finally {
      // ローディング状態を解除
      setIsLoading(false);
    }
  };

  // UIコンポーネントをレンダリング
  return (
    // 最外層：全画面中央揃えのダークモードベースコンテナ
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070A10] text-slate-100 p-4">
      {/* 登録カードコンテナ */}
      <div className="w-full max-w-md bg-[#0B0F19] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* ヘッダーエリア */}
        <div className="text-center space-y-2">
          {/* アイコン枠 */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-3xl mb-2 shadow-inner">
            ✨
          </div>
          {/* タイトル */}
          <h1 className="text-2xl font-black tracking-wider text-white">アカウント作成</h1>
          {/* サブタイトル */}
          <p className="text-xs text-slate-400">新しいアカウントを作成してサービスをご利用ください</p>
        </div>

        {/* エラーメッセージが存在する場合のみ表示するアラート */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* 新規登録停止時の判定表示分岐 */}
        {isRegistrationAllowed === false ? (
          // 登録停止中の案内表示
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold text-center">
            現在、新規ユーザー登録は停止しています。
          </div>
        ) : (
          // 登録許可時のフォーム表示
          <>
            {/* 登録用フォーム要素 */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* お名前入力欄 */}
              <div className="space-y-1">
                {/* ラベル */}
                <label className="text-xs font-bold text-slate-300">お名前（任意）</label>
                {/* テキスト入力ボックス */}
                <input
                  type="text" // 入力タイプ：テキスト
                  value={name} // 入力値のバインド
                  onChange={(e) => setName(e.target.value)} // 入力イベントハンドラー
                  placeholder="山田 太郎" // プレースホルダー
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition" // クラス名
                />
              </div>

              {/* メールアドレス入力欄 */}
              <div className="space-y-1">
                {/* ラベル */}
                <label className="text-xs font-bold text-slate-300">メールアドレス</label>
                {/* メール入力ボックス */}
                <input
                  type="email" // 入力タイプ：メールアドレス
                  required // 必須入力設定
                  value={email} // 入力値のバインド
                  onChange={(e) => setEmail(e.target.value)} // 入力イベントハンドラー
                  placeholder="example@turtle.com" // プレースホルダー
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition" // クラス名
                />
              </div>

              {/* パスワード入力欄 */}
              <div className="space-y-1">
                {/* ラベル */}
                <label className="text-xs font-bold text-slate-300">パスワード（6文字以上）</label>
                {/* パスワード入力ボックス */}
                <input
                  type="password" // 入力タイプ：パスワード（マスク表示）
                  required // 必須入力設定
                  minLength={6} // 最小文字数制約（6文字）
                  value={password} // 入力値のバインド
                  onChange={(e) => setPassword(e.target.value)} // 入力イベントハンドラー
                  placeholder="••••••••" // プレースホルダー
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition" // クラス名
                />
              </div>

              {/* アカウント作成実行ボタン */}
              <button
                type="submit" // フォーム送信タイプ
                disabled={isLoading} // 通信中は連打防止のため無効化
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/20 transition disabled:opacity-50 mt-2" // クラス名
              >
                {/* 処理状態に応じた表示テキストの分岐 */}
                {isLoading ? 'アカウント作成中...' : 'アカウントを作成する'}
              </button>
            </form>
          </>
        )}

        {/* ログインページ誘導エリア */}
        <div className="text-center pt-2">
          {/* テキストとリンク */}
          <p className="text-xs text-slate-400">
            すでにアカウントをお持ちですか？{' '}
            {/* クライアントサイド遷移リンク */}
            <Link href="/login" className="text-blue-400 font-bold hover:underline">
              ログイン画面へ
            </Link>
          </p>
        </div>

      {/* カード要素の終了 */}
      </div>
    {/* ルート要素の終了 */}
    </div>
  );
}