import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { resetSignalsAndProfit, resetWatchlistToInitial } from '@/lib/watchlist/seed';

// POST: クリアボタン（取得値クリア／全クリアの2種類）
// body: { type: 'signals' | 'all' }
// - 'signals'（取得値クリア）: 最新シグナル・Long Profit集計値・単価損益・損益合計のみをクリアする。
//   並び順・選択状態・保有ポジション情報（取得単価・保有株数・取得日）は維持する。
// - 'all'（全クリア）: 上記に加え、並び順を日経225コード順にリセットし、
//   保有ポジション情報・ダッシュボード表示チェックもすべて初期状態に戻す。
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json().catch(() => ({}));
    const type = body?.type === 'all' ? 'all' : 'signals';

    if (type === 'all') {
      await resetWatchlistToInitial(prisma, userId);
    } else {
      await resetSignalsAndProfit(prisma, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist clear error:', error);
    return NextResponse.json({ error: 'Failed to clear watchlist' }, { status: 500 });
  }
}
