import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST: ダッシュボード表示用チェック状態（dashboardSelected）を更新
// body: { selected: boolean }
// Next.js 16: 動的ルートのparamsはPromiseで渡されるためawaitする
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await params;

    const body = await request.json();
    const selected: boolean = Boolean(body?.selected);

    const target = await prisma.watchlist.findFirst({ where: { id, userId } });
    if (!target) {
      return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    }

    const updated = await prisma.watchlist.update({
      where: { id },
      data: { dashboardSelected: selected },
    });

    return NextResponse.json({ watchlist: updated });
  } catch (error) {
    console.error('Watchlist select error:', error);
    return NextResponse.json({ error: 'Failed to update selection' }, { status: 500 });
  }
}
