// Next.jsのAPI型定義をインポート
import { NextRequest, NextResponse } from 'next/server';
// Yahoo Financeクライアントをインポート
import YahooFinance from 'yahoo-finance2';
// タートル戦略の共通計算ロジックをインポート
import {
  calculatePineTurtle2ATR,
  DEFAULT_STRATEGY_PARAMS,
  STRATEGY_PARAM_LIMITS,
  sanitizeParamValue,
} from '@/lib/turtleStrategy';

// インスタンス初期化
const yahooFinance = new YahooFinance();

// GETハンドラー
export async function GET(request: NextRequest) {
  // 例外処理開始
  try {
    // クエリパラメータ取得
    const { searchParams } = new URL(request.url);
    // 銘柄コード
    const symbol = searchParams.get('symbol') || '8035.T';
    // 期間
    const period = searchParams.get('period') || 'max';
    // 足種別
    const interval = (searchParams.get('interval') || '1d') as '1d' | '1wk' | '1mo';

    // 戦略パラメータ（未指定・不正値の場合はデフォルト値にフォールバック）
    const entryLength = sanitizeParamValue(
      searchParams.get('entryDays'),
      DEFAULT_STRATEGY_PARAMS.entryLength,
      STRATEGY_PARAM_LIMITS.entryLength
    );
    // 手仕舞い期間
    const exitLength = sanitizeParamValue(
      searchParams.get('exitDays'),
      DEFAULT_STRATEGY_PARAMS.exitLength,
      STRATEGY_PARAM_LIMITS.exitLength
    );
    // ATR期間
    const atrLength = sanitizeParamValue(
      searchParams.get('atrDays'),
      DEFAULT_STRATEGY_PARAMS.atrLength,
      STRATEGY_PARAM_LIMITS.atrLength
    );

    // 終了日（現在）
    const endDate = new Date();
    // 開始日（計算基準用）
    const startDate = new Date();

    // 期間パラメータの受け取り表記ゆれに対応したデータ取得開始日の指定
    if (period === '1m' || period === '1mo') {
      // 1か月用：計算用マージンを含め3か月分取得
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === '3m' || period === '3mo') {
      // 3か月用：計算用マージンを含め6か月分取得
      startDate.setMonth(startDate.getMonth() - 6);
    } else if (period === '6m' || period === '6mo') {
      // 6か月用：計算用マージンを含め10か月分取得
      startDate.setMonth(startDate.getMonth() - 10);
    } else if (period === '1y' || period === '2y') {
      // 1年用：計算用マージンを含め2年分取得
      startDate.setFullYear(startDate.getFullYear() - 2);
    } else if (period === '3y' || period === '5y') {
      // 3年用：計算用マージンを含め5年分取得
      startDate.setFullYear(startDate.getFullYear() - 5);
    } else if (period === 'max' || period === '最長') {
      // 最長：十分な過去データ（20年前）を取得
      startDate.setFullYear(startDate.getFullYear() - 20);
    } else {
      // 未定義パラメータの場合はデフォルトで5年分を取得
      startDate.setFullYear(startDate.getFullYear() - 5);
    }

    // データ取得（無効な証券コード等で失敗した場合は個別にハンドリング）
    let result: any;
    try {
      result = await yahooFinance.historical(symbol, {
        // 開始日
        period1: startDate,
        // 終了日
        period2: endDate,
        // 足間隔
        interval: interval,
      });
    } catch (fetchError) {
      // 無効な証券コード等、想定内の失敗としてログレベルをwarnに留める（console.errorは開発オーバーレイを誘発するため使わない）
      console.warn(`Historical data fetch failed for symbol "${symbol}":`, fetchError);
      // 分かりやすいエラーメッセージとともに404を返却
      return NextResponse.json(
        { error: `証券コード「${symbol}」のデータが見つかりませんでした。コードをご確認ください。` },
        { status: 404 }
      );
    }

    // 空判定
    if (!result || result.length === 0) {
      // 404返却（分かりやすいエラーメッセージ付き）
      return NextResponse.json(
        { error: `証券コード「${symbol}」のデータが見つかりませんでした。コードをご確認ください。` },
        { status: 404 }
      );
    // 条件分岐終了
    }

    // 企業名の取得（失敗してもチャート表示自体は継続できるよう個別にtry/catch）
    let companyName: string | undefined;
    try {
      // Yahoo Financeのクオート情報を取得
      const quote: any = await yahooFinance.quote(symbol);
      // 正式名称または略称を採用
      companyName = quote?.longName || quote?.shortName || undefined;
    } catch (quoteError) {
      // 企業名取得の失敗は致命的ではないためwarnログのみ
      console.warn(`Company name fetch failed for symbol "${symbol}":`, quoteError);
    }

    // 計算実行（ユーザー設定の戦略パラメータを反映）
    const payload = calculatePineTurtle2ATR(result, { entryLength, exitLength, atrLength });

    // JSON返却（企業名を含む）
    return NextResponse.json({ ...payload, companyName });
  // 例外捕捉
  } catch (error: any) {
    // ログ出力（サーバー側の想定外エラーのみ）
    console.error('API /api/stock Error:', error);
    // 500返却
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  // 例外処理終了
  }
// GET終了
}
