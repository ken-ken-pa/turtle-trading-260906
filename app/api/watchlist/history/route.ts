import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// 履歴として保存できる最大件数（11件目以降は最古を自動削除）
const MAX_HISTORY_COUNT = 10;

// GET: ウォッチリスト履歴を新しい順に取得（最大10件）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const histories = await prisma.watchlistHistory.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ histories });
  } catch (error) {
    console.error('Watchlist history fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist history' }, { status: 500 });
  }
}

// POST: 現在のウォッチリスト状態を履歴としてスナップショット保存する
// body: { memo: string }
// 保存内容: 並び順・選択状態・Long Profit集計値・最新シグナル状態・保有ポジション情報（すべて丸ごと）＋計算に使った設定
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const memo: string = (body?.memo ?? '').toString().slice(0, 200);
    if (!memo) {
      return NextResponse.json({ error: '覚書を入力してください' }, { status: 400 });
    }

    const [setting, items] = await Promise.all([
      prisma.userSetting.findUnique({ where: { userId } }),
      prisma.watchlist.findMany({
        where: { userId },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const snapshotItems = items.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      sortOrder: item.sortOrder,
      dashboardSelected: item.dashboardSelected,
      profitCount: item.profitCount,
      profitTotalProfit: item.profitTotalProfit,
      profitAvgProfit: item.profitAvgProfit,
      profitWins: item.profitWins,
      profitLosses: item.profitLosses,
      profitDraws: item.profitDraws,
      profitWinRate: item.profitWinRate,
      latestSignalType: item.latestSignalType,
      latestSignalDate: item.latestSignalDate,
      latestSignalPrice: item.latestSignalPrice,
      // 保有ポジション情報（参考表示のみ。復元対象には含めない）
      acquisitionPrice: item.acquisitionPrice,
      acquisitionShares: item.acquisitionShares,
      acquisitionDate: item.acquisitionDate,
      unitProfit: item.unitProfit,
      totalProfit: item.totalProfit,
    }));

    const created = await prisma.watchlistHistory.create({
      data: {
        userId,
        memo,
        interval: setting?.interval ?? '1d',
        entryDays: setting?.entryDays ?? 20,
        exitDays: setting?.exitDays ?? 10,
        atrDays: setting?.atrDays ?? 20,
        aggregationPeriod: setting?.aggregationPeriod ?? '6mo',
        items: snapshotItems as any,
      },
    });

    // 上限（10件）を超えた分は最古から削除
    const all = await prisma.watchlistHistory.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    if (all.length > MAX_HISTORY_COUNT) {
      const toDelete = all.slice(MAX_HISTORY_COUNT).map((h) => h.id);
      await prisma.watchlistHistory.deleteMany({ where: { id: { in: toDelete } } });
    }

    return NextResponse.json({ history: created });
  } catch (error) {
    console.error('Watchlist history create error:', error);
    return NextResponse.json({ error: 'Failed to save watchlist history' }, { status: 500 });
  }
}
