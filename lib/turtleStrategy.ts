// タートル・トレーディング戦略（Pine Script: TURTLE_2ATR）の計算ロジック
// /api/stock と /api/cron/check-signals の両方から共通利用するための共有モジュール

// 戦略パラメータのインターフェース定義
export interface TurtleStrategyParams {
  // エントリー期間（デフォルト20日）
  entryLength?: number;
  // 手仕舞い期間（デフォルト10日）
  exitLength?: number;
  // ATR期間（デフォルト20日）
  atrLength?: number;
  // ATR乗数（デフォルト2.0）
  atrMultiplier?: number;
}

// 戦略パラメータのデフォルト値（画面の初期表示・データ未設定ユーザー向け）
export const DEFAULT_STRATEGY_PARAMS: Required<TurtleStrategyParams> = {
  entryLength: 20,
  exitLength: 10,
  atrLength: 20,
  atrMultiplier: 2.0,
};

// 許容するパラメータの範囲（極端な値によるパフォーマンス劣化・計算破綻を防止）
export const STRATEGY_PARAM_LIMITS = {
  entryLength: { min: 2, max: 200 },
  exitLength: { min: 2, max: 200 },
  atrLength: { min: 2, max: 200 },
};

// クエリパラメータ等から受け取った任意の値を、安全な範囲の整数に丸め込む関数
export function sanitizeParamValue(
  value: unknown,
  fallback: number,
  limits: { min: number; max: number }
): number {
  // 数値変換
  const num = Number(value);
  // 数値でない、またはNaNの場合はフォールバック値を採用
  if (!Number.isFinite(num)) return fallback;
  // 整数化
  const intVal = Math.round(num);
  // 範囲内にクランプして返却
  return Math.min(limits.max, Math.max(limits.min, intVal));
}

// Pine Script (TURTLE_2ATR) の計算ロジック本体
export function calculatePineTurtle2ATR(quotes: any[], params: TurtleStrategyParams = {}) {
  // パラメータを確定（未指定時はデフォルト値を使用）
  const entryLength = params.entryLength ?? DEFAULT_STRATEGY_PARAMS.entryLength;
  // 手仕舞い期間
  const exitLength = params.exitLength ?? DEFAULT_STRATEGY_PARAMS.exitLength;
  // ATR期間
  const atrLength = params.atrLength ?? DEFAULT_STRATEGY_PARAMS.atrLength;
  // ATR乗数
  const atrMultiplier = params.atrMultiplier ?? DEFAULT_STRATEGY_PARAMS.atrMultiplier;

  // ローソク足データ
  const candles: any[] = [];
  // 20日高値ライン（青色太線）
  const upperLines: any[] = [];
  // 20日安値ライン（青色太線）
  const lowerLines: any[] = [];
  // トレンドライン（黄色太線）
  const trendLines: any[] = [];
  // 10日手仕舞いライン（水色細線）
  const exitLines: any[] = [];
  // 2ATRストップライン（黄色点線）
  const stopLines: any[] = [];
  // シグナル情報配列
  const signals: any[] = [];

  // TR配列
  const trArr: number[] = [];

  // トレンド判定用カウンタ
  let barsSinceHighBreak = 9999;
  // 安値ブレイクカウンタ
  let barsSinceLowBreak = 9999;
  // ポジションフラグ（0: ノンポジ, 1: ロング保有中）
  let inLongPosition = false;
  // 損切り価格
  let longStopPrice: number | null = null;

  // 全バーを走査
  for (let i = 0; i < quotes.length; i++) {
    // 現在バー
    const cur = quotes[i];
    // 日付文字列（YYYY-MM-DD）
    const timeStr = new Date(cur.date).toISOString().split('T')[0];

    // ローソク足を追加
    candles.push({
      // 日付
      time: timeStr,
      // 始値
      open: cur.open,
      // 高値
      high: cur.high,
      // 安値
      low: cur.low,
      // 終値
      close: cur.close,
    });

    // TRの計算
    if (i === 0) {
      // 初日
      trArr.push(cur.high - cur.low);
    // 2日目以降
    } else {
      // 前日終値
      const prevClose = quotes[i - 1].close;
      // TR算出
      const tr = Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prevClose),
        Math.abs(cur.low - prevClose)
      );
      // 配列へ格納
      trArr.push(tr);
    // 条件分岐終了
    }

    // ブレイクカウンタをインクリメント
    barsSinceHighBreak++;
    // インクリメント
    barsSinceLowBreak++;

    // 計算期間（エントリー期間）以上のバーが存在する場合
    if (i >= entryLength) {
      // 前日までのエントリー期間分
      const prevEntry = quotes.slice(i - entryLength, i);
      // 前日までの手仕舞い期間分
      const prevExit = quotes.slice(i - exitLength, i);

      // 前日エントリー期間高値
      const prevUp = Math.max(...prevEntry.map((item) => item.high));
      // 前日エントリー期間安値
      const prevDown = Math.min(...prevEntry.map((item) => item.low));
      // 前日手仕舞い期間安値
      const prevExitDown = Math.min(...prevExit.map((item) => item.low));
      // 前日手仕舞い期間高値
      const prevExitUp = Math.max(...prevExit.map((item) => item.high));

      // 当日を含めたエントリー期間最高値
      const currentEntry = quotes.slice(i - entryLength + 1, i + 1);
      // 当日エントリー期間高値
      const up = Math.max(...currentEntry.map((item) => item.high));
      // 当日エントリー期間安値
      const down = Math.min(...currentEntry.map((item) => item.low));

      // 高値更新ブレイク判定
      if (cur.high >= prevUp) barsSinceHighBreak = 0;
      // 安値更新ブレイク判定
      if (cur.low <= prevDown) barsSinceLowBreak = 0;

      // トレンドライン（Pine: entryLine）
      const entryLineVal = barsSinceHighBreak <= barsSinceLowBreak ? down : up;
      // 手仕舞いライン（Pine: exitLine）
      const exitLineVal = barsSinceHighBreak <= barsSinceLowBreak ? prevExitDown : prevExitUp;

      // ATRの計算
      const trSlice = trArr.slice(Math.max(0, i - atrLength + 1), i + 1);
      // 合計値
      const trSum = trSlice.reduce((a, b) => a + b, 0);
      // ATR値
      const atrValue = trSum / trSlice.length;
      // ATRストップ幅
      const atrStopOffset = atrValue * atrMultiplier;

      // 買いシグナル（前日エントリー期間高値超え）
      const buySignal = cur.high > prevUp;
      // 手仕舞いシグナル（前日手仕舞い期間安値割れ）
      const buyExit = cur.low < prevExitDown;
      // 損切りシグナル（ATRストップ安値割れ）
      const stopExit = longStopPrice !== null && cur.low < longStopPrice;

      // Long Entry 判定（ノーポジション時にエントリー期間高値ブレイク）
      if (buySignal && !inLongPosition) {
        // ポジション保有状態に更新
        inLongPosition = true;
        // ATR損切りラインを設定
        longStopPrice = cur.close - atrStopOffset;

        // Long Entryシグナルを登録
        signals.push({
          // 日付
          time: timeStr,
          // タイプ
          type: 'LONG_ENTRY',
          // 終値
          price: cur.close,
        });
      // Exit Long 判定（ロング保有中に手仕舞い期間安値割れ または ATR損切り抵触）
      } else if (inLongPosition && (buyExit || stopExit)) {
        // ポジション解除
        inLongPosition = false;
        // 損切りライン解除
        longStopPrice = null;

        // Exit Longシグナルを登録
        signals.push({
          // 日付
          time: timeStr,
          // タイプ
          type: 'EXIT_LONG',
          // 終値
          price: cur.close,
        });
      // 条件分岐終了
      }

      // Upper Line（青色太線）
      upperLines.push({
        // 日付
        time: timeStr,
        // 価格
        value: up,
      });

      // Lower Line（青色太線）
      lowerLines.push({
        // 日付
        time: timeStr,
        // 価格
        value: down,
      });

      // トレンドライン（黄色太線）
      trendLines.push({
        // 日付
        time: timeStr,
        // 価格
        value: entryLineVal,
      });

      // Exit Line（水色手仕舞い線）
      exitLines.push({
        // 日付
        time: timeStr,
        // 価格
        value: exitLineVal,
      });

      // Stop Line（黄色点線: ロング保有時のみ）
      if (inLongPosition && longStopPrice !== null) {
        // ストップデータ追加
        stopLines.push({
          // 日付
          time: timeStr,
          // 価格
          value: longStopPrice,
        });
      // 条件分岐終了
      }
    // 指標計算終了
    }
  // ループ終了
  }

  // 整形結果を返却
  return { candles, upperLines, lowerLines, trendLines, exitLines, stopLines, signals };
// 関数終了
}

// ─────────────────────────────────────────────────────────────
// Long Profit バックテスト集計用ロジック（/api/backtest から利用）
// ─────────────────────────────────────────────────────────────

// シグナル1件分の型定義（calculatePineTurtle2ATRのsignalsと同一形状）
export interface TurtleSignal {
  // 日付文字列（YYYY-MM-DD）
  time: string;
  // シグナル種別（'LONG_ENTRY' | 'EXIT_LONG'）
  type: string;
  // シグナル発生時の終値
  price: number;
}

// 1回のLong Entry〜Exit Longで完結した取引（トレード）の型定義
export interface LongTrade {
  // エントリー日
  entryTime: string;
  // エントリー価格（Long Entry終値）
  entryPrice: number;
  // 手仕舞い日
  exitTime: string;
  // 手仕舞い価格（Exit Long終値）
  exitPrice: number;
  // Long Profit（手仕舞い終値 − エントリー終値）
  profit: number;
}

// トレード集計結果の型定義
export interface LongTradeSummary {
  // Long Profitの発生回数（完結した取引数）
  count: number;
  // Long Profitの合計
  totalProfit: number;
  // Long Profitの平均（countが0の場合は0）
  averageProfit: number;
  // 勝ち数（Long Profit > 0）
  wins: number;
  // 負け数（Long Profit < 0）
  losses: number;
  // 引分数（Long Profit === 0）
  draws: number;
  // 勝率（勝ち ÷ （発生回数 − 引分）の比率。分母が0の場合はnull）
  winRate: number | null;
}

// ダッシュボードの表示期間セレクタ（PERIOD_OPTIONS: 1mo/3mo/6mo/1y/3y/max）に応じた
// シグナル絞り込み用の開始日を算出する関数。
// components/dashboard/TurtleChart.tsx の calculateFromDate と同一のロジックを踏襲することで、
// バックテスト集計対象の期間を実際のチャート表示範囲と一致させる。
// 'max'（最長）の場合は絞り込み不要のためnullを返す。
export function getPeriodStartDate(latestDateStr: string, period: string): string | null {
  // 最長期間の場合は絞り込みなし
  if (period === 'max' || period === '最長') return null;

  // 基準日（最新データの日付）をYYYY-MM-DDから分解
  const [year, month, day] = latestDateStr.split('-').map(Number);
  // 基準日のDateオブジェクトを作成
  const targetDate = new Date(year, month - 1, day);

  // 期間指定値による開始日の遡り分岐（TurtleChart.tsxのcalculateFromDateと同一の対応表）
  switch (period) {
    // 1か月前
    case '1mo':
      targetDate.setMonth(targetDate.getMonth() - 1);
      break;
    // 3か月前
    case '3mo':
      targetDate.setMonth(targetDate.getMonth() - 3);
      break;
    // 6か月前
    case '6mo':
      targetDate.setMonth(targetDate.getMonth() - 6);
      break;
    // 1年前
    case '1y':
      targetDate.setFullYear(targetDate.getFullYear() - 1);
      break;
    // 3年前
    case '3y':
      targetDate.setFullYear(targetDate.getFullYear() - 3);
      break;
    // 未定義値は6か月前をデフォルトとする
    default:
      targetDate.setMonth(targetDate.getMonth() - 6);
      break;
  }

  // 年をYYYY-MM-DD文字列用に取得
  const y = targetDate.getFullYear();
  // 月を2桁埋めで取得
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  // 日を2桁埋めで取得
  const d = String(targetDate.getDate()).padStart(2, '0');
  // YYYY-MM-DD形式で返却
  return `${y}-${m}-${d}`;
}

// シグナル配列（時系列順）から、期間内で完結したLong Entry→Exit Longのペア（トレード）のみを抽出する関数
//
// 仕様:
// - 先頭がExit Long（対応するLong Entryが期間開始前に発生している未決済ポジションの手仕舞い）の場合は無視し、
//   次のLong Entryから計算を開始する
// - 末尾がLong Entryで終わっている（対応するExit Longがまだ発生していない）場合は無視する
// - calculatePineTurtle2ATRのsignalsは状態機械上、常にLONG_ENTRY→EXIT_LONGの順で交互に発生するため、
//   絞り込み後の配列も同様に交互である前提でペアリングする
export function extractLongTrades(signals: TurtleSignal[]): LongTrade[] {
  // 結果格納用配列
  const trades: LongTrade[] = [];

  // 先頭のLong Entryのインデックスを探索（それより前に残るExit Longは無視される）
  const startIndex = signals.findIndex((s) => s.type === 'LONG_ENTRY');
  // Long Entryが1件も存在しない場合は空配列を返却
  if (startIndex === -1) return trades;

  // Long Entryから2件ずつ（Entry, Exit）読み進めながらペアリング
  let i = startIndex;
  // 配列末尾まで走査
  while (i < signals.length) {
    // 現在位置のシグナル
    const entry = signals[i];
    // Long Entryでない位置に来た場合は次へ進める（想定外データに対する安全策）
    if (entry.type !== 'LONG_ENTRY') {
      i++;
      continue;
    }
    // 次のシグナル（対応するExit Longの候補）
    const exit = signals[i + 1];
    // 次がExit Longの場合のみ取引として確定
    if (exit && exit.type === 'EXIT_LONG') {
      // 取引情報を配列へ追加
      trades.push({
        entryTime: entry.time,
        entryPrice: entry.price,
        exitTime: exit.time,
        exitPrice: exit.price,
        profit: exit.price - entry.price,
      });
      // 2件分進める
      i += 2;
    } else {
      // 対応するExit Longが無い（末尾がLong Entryで終わっている）ため、この取引は無視して走査終了
      break;
    }
  }

  // 確定済みの取引配列を返却
  return trades;
}

// トレード配列からLong Profitの集計（回数・合計・平均・勝敗数・引分数・勝率）を算出する関数
export function summarizeLongTrades(trades: LongTrade[]): LongTradeSummary {
  // 発生回数
  const count = trades.length;
  // 合計Long Profit
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  // 平均Long Profit（0件の場合は0）
  const averageProfit = count > 0 ? totalProfit / count : 0;
  // 勝ち数（Long Profit > 0）
  const wins = trades.filter((t) => t.profit > 0).length;
  // 負け数（Long Profit < 0）
  const losses = trades.filter((t) => t.profit < 0).length;
  // 引分数（Long Profit === 0）
  const draws = trades.filter((t) => t.profit === 0).length;
  // 勝率の分母（発生回数 − 引分）
  const winRateDenominator = count - draws;
  // 勝率（分母が0の場合はnull＝算出不能）
  const winRate = winRateDenominator > 0 ? wins / winRateDenominator : null;

  // 集計結果を返却
  return { count, totalProfit, averageProfit, wins, losses, draws, winRate };
}