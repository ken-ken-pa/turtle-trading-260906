import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST: ダッシュボードのチャートカードをドラッグ&ドロップで入れ替えた際に、
// 該当2銘柄のsortOrderを入れ替えてウォッチリストの並び順に書き戻す。
// body: { idA: string, idB: string }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const { idA, idB } = body ?? {};
    if (!idA || !idB) {
      return NextResponse.json({ error: 'idA, idBを指定してください' }, { status: 400 });
    }

    const [itemA, itemB] = await Promise.all([
      prisma.watchlist.findFirst({ where: { id: idA, userId } }),
      prisma.watchlist.findFirst({ where: { id: idB, userId } }),
    ]);
    if (!itemA || !itemB) {
      return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.watchlist.update({ where: { id: itemA.id }, data: { sortOrder: itemB.sortOrder } }),
      prisma.watchlist.update({ where: { id: itemB.id }, data: { sortOrder: itemA.sortOrder } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist swap error:', error);
    return NextResponse.json({ error: 'Failed to swap order' }, { status: 500 });
  }
}
