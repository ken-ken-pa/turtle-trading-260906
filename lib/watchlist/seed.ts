// ウォッチリストの初期シード処理
//
// 新仕様（260906）:
// ウォッチリストの初期セットは「日経225全銘柄」。
// ユーザーが初めて /watchlist を開いた時点（＝Watchlistレコードが0件の時点）で、
// Nikkei225Constituent（証券コード順）をそのままWatchlistへコピーする。
// 以降はユーザーが自由に追加・削除・並べ替えできる。

import { PrismaClient } from '@prisma/client';

// ログイン中ユーザーのウォッチリストが空の場合のみ、日経225全銘柄で初期化する
export async function ensureWatchlistSeeded(prisma: PrismaClient, userId: string): Promise<void> {
  const count = await prisma.watchlist.count({ where: { userId } });
  // 既に1件でもあれば何もしない（初回のみのシード処理のため）
  if (count > 0) return;

  const constituents = await prisma.nikkei225Constituent.findMany({
    orderBy: { symbol: 'asc' },
  });

  if (constituents.length === 0) {
    // 日経225マスタ自体が未投入の場合はシードせず終了（データ投入は別途管理画面等で行う想定）
    return;
  }

  await prisma.watchlist.createMany({
    data: constituents.map((c, index) => ({
      userId,
      symbol: c.symbol,
      name: c.name,
      sortOrder: index,
      dashboardSelected: false,
    })),
    skipDuplicates: true,
  });
}

// 「取得値クリア」用：最新シグナル・Long Profit集計値・単価損益・損益合計のみをクリアする。
// 並び順(sortOrder)・選択状態(dashboardSelected)・保有ポジション情報（取得単価・保有株数・取得日）は維持する。
export async function resetSignalsAndProfit(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.watchlist.updateMany({
      where: { userId },
      data: {
        profitCount: null,
        profitTotalProfit: null,
        profitAvgProfit: null,
        profitWins: null,
        profitLosses: null,
        profitDraws: null,
        profitWinRate: null,
        profitCalculatedAt: null,
        latestSignalType: null,
        latestSignalDate: null,
        latestSignalPrice: null,
        unitProfit: null,
        totalProfit: null,
      },
    }),
    // シグナル履歴を全削除（＝「最新シグナル」が値無しの状態に戻る）
    prisma.signalHistory.deleteMany({
      where: { watchlist: { userId } },
    }),
  ]);
}

// 「全クリア」用：並び順を日経225コード順（追加銘柄は末尾）にリセットし、
// 「取得値クリア」の内容（最新シグナル・Long Profit集計値・単価損益・損益合計）に加えて、
// 保有ポジション情報（取得単価・保有株数・取得日）とダッシュボード表示チェックもすべて初期状態に戻す。
// ※登録銘柄そのもの（ウォッチリストへの追加・削除）は維持する
export async function resetWatchlistToInitial(prisma: PrismaClient, userId: string): Promise<void> {
  const [items, constituents] = await Promise.all([
    prisma.watchlist.findMany({ where: { userId } }),
    prisma.nikkei225Constituent.findMany({ orderBy: { symbol: 'asc' } }),
  ]);

  const nikkeiOrder = new Map(constituents.map((c, index) => [c.symbol, index]));
  const nikkeiCount = constituents.length;

  // 日経225構成銘柄はコード順、追加銘柄（マスタに存在しない）は末尾に証券コード順で並べる
  const sorted = [...items].sort((a, b) => {
    const orderA = nikkeiOrder.has(a.symbol) ? nikkeiOrder.get(a.symbol)! : nikkeiCount + Number(a.symbol);
    const orderB = nikkeiOrder.has(b.symbol) ? nikkeiOrder.get(b.symbol)! : nikkeiCount + Number(b.symbol);
    return orderA - orderB;
  });

  await prisma.$transaction([
    ...sorted.map((item, index) =>
      prisma.watchlist.update({
        where: { id: item.id },
        data: {
          sortOrder: index,
          dashboardSelected: false,
          profitCount: null,
          profitTotalProfit: null,
          profitAvgProfit: null,
          profitWins: null,
          profitLosses: null,
          profitDraws: null,
          profitWinRate: null,
          profitCalculatedAt: null,
          latestSignalType: null,
          latestSignalDate: null,
          latestSignalPrice: null,
          acquisitionPrice: null,
          acquisitionShares: null,
          acquisitionDate: null,
          unitProfit: null,
          totalProfit: null,
        },
      })
    ),
    // シグナル履歴を全削除（＝「最新シグナル」が値無しの状態に戻る）
    prisma.signalHistory.deleteMany({
      where: { watchlist: { userId } },
    }),
  ]);
}
