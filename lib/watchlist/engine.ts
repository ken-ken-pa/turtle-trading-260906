// 「最新シグナル取得」「Long Profit集計取得」共通のバッチ処理エンジン
//
// 実行方式（旧 lib/screening/runEngine.ts と同一の考え方を踏襲）:
// - Vercel Cron / SSE / WebSocketは使わず、ブラウザ（Web Worker）が
//   一定間隔（1〜2秒）でAPIルートをポーリングし、1回の呼び出しで数銘柄だけ処理する
// - 進捗は BatchJob.processedCount / totalCount で管理する
// - ウォッチリストの並び順（sortOrder）を「処理待ちキュー」の順序としてそのまま利用する
//   （ジョブ実行中に並び替えが行われるのは稀なケースとして許容する）

import { BatchJobStatus, BatchJobType, PrismaClient, SignalSource } from '@prisma/client';
import YahooFinance from 'yahoo-finance2';
import {
  DEFAULT_STRATEGY_PARAMS,
  calculatePineTurtle2ATR,
  extractLongTrades,
  getPeriodStartDate,
  summarizeLongTrades,
} from '@/lib/turtleStrategy';
import { toYahooTicker } from '@/lib/yahooTicker';

const yahooFinance = new YahooFinance();

// 1回のポーリングで処理する銘柄数（Yahoo Financeへの負荷・実行時間を考慮した小さめのバッチ）
export const BATCH_CHUNK_SIZE = 3;

// 株価履歴の取得範囲（既存 /api/backtest ・ screening/backtest.ts と同一の20年分）
function getHistoryRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 20);
  return { period1: startDate, period2: endDate };
}

// 「最新シグナル取得」の対象取引日の“上限”をJST基準で算出する。
// 区切りはJST 9:00〜翌8:59。例:
//   JST 10:00にクリック → 上限は「本日」
//   JST 16:00にクリック → 上限は「本日」（15:30の終値が本日分として確定している）
//   JST 翌7:00にクリック → 上限は「前日」（まだ9:00を過ぎていないため前日扱い）
// 土日・祝日で上限日に取引が無かった場合は、実際に取得できた直近営業日の終値を対象とする
// （下のfindReferenceTradingDateで、この上限以下で最も新しい実在バーの日付を探す）
function getCutoffDateJST(): string {
  const now = new Date();
  // UTC時刻に9時間加算することで「UTC表記のままJSTの壁時計時刻」を得る（getUTCHoursでJST時分を取得できる）
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (jst.getUTCHours() < 9) {
    jst.setUTCDate(jst.getUTCDate() - 1);
  }
  return jst.toISOString().split('T')[0];
}

// 取得済みの株価バー配列(quotes、日付昇順)の中から、cutoff日以下で最も新しい実在の取引日を探す。
// 土日・祝日にクリックされた場合、cutoff当日には取引が無いため、直近営業日（例: 金曜日）まで遡って一致させる。
function findReferenceTradingDate(quotes: any[], cutoff: string): string | null {
  for (let i = quotes.length - 1; i >= 0; i--) {
    const qDate = new Date(quotes[i].date).toISOString().split('T')[0];
    if (qDate <= cutoff) return qDate;
  }
  return null;
}

// 保有損益（単価損益・損益合計）を計算するヘルパー関数。
// 取得単価・保有株数が両方入力されている場合のみ計算し、それ以外はnull（未計算）を返す。
// 基準株価には「最新シグナル取得」「Long Profit集計取得」どちらの処理でも共通して取得できる
// 直近終値（quotes配列の最終要素のclose）を用いる。シグナルの発生有無には左右されない。
function calculateHoldingProfit(
  quotes: any[],
  acquisitionPrice: number | null,
  acquisitionShares: number | null
): { unitProfit: number | null; totalProfit: number | null } {
  const latestClose = quotes.length > 0 ? quotes[quotes.length - 1].close : null;
  if (latestClose == null || acquisitionPrice == null || acquisitionShares == null) {
    return { unitProfit: null, totalProfit: null };
  }
  const unitProfit = latestClose - acquisitionPrice;
  const totalProfit = unitProfit * acquisitionShares;
  return { unitProfit, totalProfit };
}

// 新規バッチジョブを開始する（対象はログイン中ユーザーのウォッチリスト全件）
export async function startBatchJob(
  prisma: PrismaClient,
  userId: string,
  type: BatchJobType
) {
  const totalCount = await prisma.watchlist.count({ where: { userId } });

  const job = await prisma.batchJob.create({
    data: {
      userId,
      type,
      status: BatchJobStatus.RUNNING,
      totalCount,
      processedCount: 0,
      errorCount: 0,
    },
  });

  // 対象0件（ウォッチリストが空）の場合は即完了扱いにする
  if (totalCount === 0) {
    return prisma.batchJob.update({
      where: { id: job.id },
      data: { status: BatchJobStatus.COMPLETED, completedAt: new Date() },
    });
  }

  return job;
}

// バッチジョブを1チャンク分処理する（ブラウザ側から1〜2秒間隔で呼び出される想定）
export async function processBatchJobChunk(prisma: PrismaClient, jobId: string, userId: string) {
  const job = await prisma.batchJob.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new Error('ジョブが見つかりません');

  // 既に終了しているジョブはそのまま返却（多重ポーリング対策）
  if (job.status !== BatchJobStatus.RUNNING) return job;

  const setting = await prisma.userSetting.findUnique({ where: { userId } });
  const entryDays = setting?.entryDays ?? DEFAULT_STRATEGY_PARAMS.entryLength;
  const exitDays = setting?.exitDays ?? DEFAULT_STRATEGY_PARAMS.exitLength;
  const atrDays = setting?.atrDays ?? DEFAULT_STRATEGY_PARAMS.atrLength;
  const interval = (setting?.interval ?? '1d') as '1d' | '1wk' | '1mo';
  const aggregationPeriod = setting?.aggregationPeriod ?? '6mo';

  // ウォッチリストの並び順（sortOrder）を処理キューの順序として使用
  const items = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  });

  const slice = items.slice(job.processedCount, job.processedCount + BATCH_CHUNK_SIZE);
  let errorDelta = 0;

  const cutoffDate = getCutoffDateJST();

  for (const item of slice) {
    try {
      const ticker = toYahooTicker(item.symbol);
      const { period1, period2 } = getHistoryRange();
      const quotes: any[] = await yahooFinance.historical(ticker, {
        period1,
        period2,
        interval,
      });

      if (!quotes || quotes.length === 0) {
        errorDelta++;
        continue;
      }

      const { signals } = calculatePineTurtle2ATR(quotes, {
        entryLength: entryDays,
        exitLength: exitDays,
        atrLength: atrDays,
      });

      // 保有損益（単価損益・損益合計）。取得単価・保有株数が未入力の銘柄はnullのまま。
      // 取得単価・保有株数・取得日そのものはここでは一切変更しない（ユーザー入力を維持）。
      const { unitProfit, totalProfit } = calculateHoldingProfit(
        quotes,
        item.acquisitionPrice,
        item.acquisitionShares
      );

      if (job.type === BatchJobType.SIGNAL_FETCH) {
        // クリック時点の上限日（JST 9:00〜翌8:59区切り）以下で最も新しい実在の取引日を求める。
        // 土日・祝日にクリックした場合は、直近営業日（例:金曜）の終値が対象になる。
        const referenceDate = findReferenceTradingDate(quotes, cutoffDate);
        const latest = signals[signals.length - 1];
        // 対象取引日に発生したシグナルのみを「最新シグナル」として扱う。それ以外は空欄（null）にクリアする。
        if (latest && referenceDate && latest.time === referenceDate) {
          const latestDate = new Date(latest.time);
          await prisma.watchlist.update({
            where: { id: item.id },
            data: {
              latestSignalType: latest.type,
              latestSignalDate: latestDate,
              latestSignalPrice: latest.price,
              unitProfit,
              totalProfit,
            },
          });

          // 監査ログとしてSignalHistoryにも記録する（同一日・同一種別の重複登録は避ける）
          const lastSaved = await prisma.signalHistory.findFirst({
            where: { watchlistId: item.id },
            orderBy: { date: 'desc' },
          });
          const isSame =
            lastSaved &&
            lastSaved.type === latest.type &&
            lastSaved.date.toISOString().split('T')[0] === latest.time;
          if (!isSame) {
            await prisma.signalHistory.create({
              data: {
                watchlistId: item.id,
                type: latest.type,
                price: latest.price,
                date: latestDate,
                source: SignalSource.MANUAL, // 呼び出し元（手動ボタン/自動再取得）で上書きされる
              },
            });
          }
        } else {
          // 対象取引日にシグナルが発生していない場合は空欄にクリアする
          await prisma.watchlist.update({
            where: { id: item.id },
            data: {
              latestSignalType: null,
              latestSignalDate: null,
              latestSignalPrice: null,
              unitProfit,
              totalProfit,
            },
          });
        }
      } else {
        // PROFIT_AGGREGATION: 集計対象期間で絞り込んでLong Profitを集計
        const latestDateStr = new Date(quotes[quotes.length - 1].date).toISOString().split('T')[0];
        const fromDateStr = getPeriodStartDate(latestDateStr, aggregationPeriod);
        const periodSignals = fromDateStr ? signals.filter((s: any) => s.time >= fromDateStr) : signals;
        const trades = extractLongTrades(periodSignals);
        const summary = summarizeLongTrades(trades);

        await prisma.watchlist.update({
          where: { id: item.id },
          data: {
            profitCount: summary.count,
            profitTotalProfit: summary.totalProfit,
            profitAvgProfit: summary.averageProfit,
            profitWins: summary.wins,
            profitLosses: summary.losses,
            profitDraws: summary.draws,
            profitWinRate: summary.winRate,
            profitCalculatedAt: new Date(),
            unitProfit,
            totalProfit,
          },
        });
      }
    } catch (err) {
      console.error(`Batch process error (${item.symbol}):`, err);
      errorDelta++;
    }
  }

  const newProcessed = job.processedCount + slice.length;
  const isDone = newProcessed >= job.totalCount;

  return prisma.batchJob.update({
    where: { id: jobId },
    data: {
      processedCount: newProcessed,
      errorCount: job.errorCount + errorDelta,
      status: isDone ? BatchJobStatus.COMPLETED : BatchJobStatus.RUNNING,
      completedAt: isDone ? new Date() : undefined,
    },
  });
}

// シグナル検出のsourceを呼び出し元に応じて設定するためのヘルパー
// （processBatchJobChunk内では一律MANUALで保存しているため、AUTO_DAILY実行時はこちらで後追い更新する）
export async function markLatestSignalsSource(
  prisma: PrismaClient,
  userId: string,
  source: SignalSource,
  since: Date
) {
  await prisma.signalHistory.updateMany({
    where: {
      watchlist: { userId },
      created_at: { gte: since },
    },
    data: { source },
  });
}
