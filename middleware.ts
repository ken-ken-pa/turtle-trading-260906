// next-auth/middlewareからwithAuthをインポート
import { withAuth } from 'next-auth/middleware';

// 認証保護ミドルウェアを定義してデフォルトエクスポート
export default withAuth({
  // 認証関連ページのカスタム定義
  pages: {
    // 未認証時に誘導するログインページURL
    signIn: '/login',
  },
});

// ミドルウェアの適用対象パス（マッチャー）を設定
export const config = {
  // 保護対象となるルート（ダッシュボード、ウォッチリスト、管理用画面）を指定
  // 260906: screening・backtestは廃止・ウォッチリストへ統合されたため対象から削除
  matcher: ['/dashboard/:path*', '/watchlist/:path*', '/admin/:path*'],
};
