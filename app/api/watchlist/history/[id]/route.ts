import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// DELETE: ウォッチリスト履歴を削除
// Next.js 16: 動的ルートのparamsはPromiseで渡されるためawaitする
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await params;

    const target = await prisma.watchlistHistory.findFirst({ where: { id, userId } });
    if (!target) {
      return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    }

    await prisma.watchlistHistory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist history delete error:', error);
    return NextResponse.json({ error: 'Failed to delete watchlist history' }, { status: 500 });
  }
}
