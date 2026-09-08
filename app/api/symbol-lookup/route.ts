// Next.js のレスポンスヘルパーをインポート
import { NextResponse } from 'next/server';
// YahooFinance クライアントをインポート
import YahooFinance from 'yahoo-finance2';

// YahooFinance インスタンスを初期化
const yf = new YahooFinance();

// 銘柄検索（オートコンプリート）ハンドラー
export async function GET(request: Request) {
  // リクエスト URL からクエリパラメータを取得
  const { searchParams } = new URL(request.url);
  // 検索クエリ 'q' を取得
  const query = searchParams.get('q');

  // クエリが空の場合は空配列を返却
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    // Yahoo Finance の検索 API を呼び出し
    const searchRes: any = await yf.search(query, {
      // 検索候補数を8件に指定
      quotesCount: 8,
      // ニュース記事は取得しない
      newsCount: 0,
    });

    // 検索結果から株式およびETFのみを抽出して整形
    const quotes = (searchRes.quotes || [])
      // 株式(EQUITY)またはETFのみフィルタリング
      .filter((item: any) => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
      // 必要なフィールド構造にマッピング
      .map((item: any) => ({
        // 銘柄コード
        symbol: item.symbol,
        // 銘柄名
        name: item.shortname || item.longname || item.symbol,
        // 上場取引所
        exchange: item.exchange || item.exchDisp || '',
      }));

    // 整形された検索結果をレスポンス
    return NextResponse.json({ quotes });
  } catch (error) {
    // エラーログを出力
    console.error('Symbol lookup error:', error);
    // エラーレスポンスを返却
    return NextResponse.json({ error: 'Search failed', quotes: [] }, { status: 500 });
  }
}
