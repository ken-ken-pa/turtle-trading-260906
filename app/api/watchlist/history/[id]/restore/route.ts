import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST: ウォッチリスト履歴を復元する
// 反映対象は「並び順・選択状態(チェック)・設定(足種別/entry・exit・ATR日数/集計対象期間)」のみ。
// Long Profit集計値・シグナル状態は履歴内の参考表示にとどめ、現在のウォッチリストの実データは上書きしない。
// Next.js 16: 動的ルートのparamsはPromiseで渡されるためawaitする
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await params;

    const history = await prisma.watchlistHistory.findFirst({ where: { id, userId } });
    if (!history) {
      return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    }

    const snapshotItems = (history.items as any[]) ?? [];
    const currentItems = await prisma.watchlist.findMany({ where: { userId } });
    const currentBySymbol = new Map(currentItems.map((i) => [i.symbol, i]));

    // 履歴に記録された並び順（sortOrder昇順）に沿って、現存する銘柄のみを並べ直す
    const matchedInHistoryOrder = [...snapshotItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => currentBySymbol.get(s.symbol))
      .filter((v): v is (typeof currentItems)[number] => Boolean(v));

    const matchedIds = new Set(matchedInHistoryOrder.map((i) => i.id));
    // 履歴保存後に追加された銘柄（履歴に存在しない）は、現在の並び順を保ったまま末尾に追加
    const unmatched = currentItems
      .filter((i) => !matchedIds.has(i.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const finalOrder = [...matchedInHistoryOrder, ...unmatched];
    const selectedSymbols = new Set(
      snapshotItems.filter((s) => s.dashboardSelected).map((s) => s.symbol)
    );

    await prisma.$transaction([
      // 設定（足種別/entry・exit・ATR日数/集計対象期間）を復元
      prisma.userSetting.upsert({
        where: { userId },
        update: {
          interval: history.interval,
          entryDays: history.entryDays,
          exitDays: history.exitDays,
          atrDays: history.atrDays,
          aggregationPeriod: history.aggregationPeriod,
        },
        create: {
          userId,
          interval: history.interval,
          entryDays: history.entryDays,
          exitDays: history.exitDays,
          atrDays: history.atrDays,
          aggregationPeriod: history.aggregationPeriod,
        },
      }),
      // 並び順・選択状態を復元（履歴に存在する銘柄のみ選択状態を反映、他は現状維持）
      ...finalOrder.map((item, index) =>
        prisma.watchlist.update({
          where: { id: item.id },
          data: {
            sortOrder: index,
            dashboardSelected: matchedIds.has(item.id)
              ? selectedSymbols.has(item.symbol)
              : item.dashboardSelected,
          },
        })
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist history restore error:', error);
    return NextResponse.json({ error: 'Failed to restore watchlist history' }, { status: 500 });
  }
}
