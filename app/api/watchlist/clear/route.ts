import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { resetWatchlist } from '@/lib/watchlist/seed';

// POST: クリアボタン
// 並び順を日経225コード順（追加銘柄は末尾）にリセットし、
// Long Profit集計値をすべて空欄に、シグナル履歴を削除する。
// ※選択状態（dashboardSelected）・登録銘柄そのものは維持する
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    await resetWatchlist(prisma, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist clear error:', error);
    return NextResponse.json({ error: 'Failed to clear watchlist' }, { status: 500 });
  }
}
