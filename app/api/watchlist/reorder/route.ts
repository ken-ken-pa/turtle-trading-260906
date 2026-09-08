import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST: ウォッチリストの手動並べ替え（ドラッグ&ドロップ後の確定処理）
// body: { orderedIds: string[] }  ※現在表示中の全行を新しい並び順で列挙したもの
// 各IDのsortOrderを配列内インデックスで一括更新する。
// これが「並び替えのベース順」となり、列ソートを「ソートなし」に戻した時にはこの順序が復元される。
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const orderedIds: string[] = body?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIdsを指定してください' }, { status: 400 });
    }

    // 自分の所有物のみであることを検証
    const owned = await prisma.watchlist.findMany({
      where: { userId, id: { in: orderedIds } },
      select: { id: true },
    });
    if (owned.length !== orderedIds.length) {
      return NextResponse.json({ error: '対象外のIDが含まれています' }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.watchlist.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder watchlist' }, { status: 500 });
  }
}
