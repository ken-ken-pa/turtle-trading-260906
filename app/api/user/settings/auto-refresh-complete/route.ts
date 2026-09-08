import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST: 「1日1回の自動再取得」が完了したことを記録する（本日分の未実行判定に使用）
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updated = await prisma.userSetting.update({
      where: { userId },
      data: { lastAutoRefreshDate: today },
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Auto refresh complete error:', error);
    return NextResponse.json({ error: 'Failed to mark auto refresh complete' }, { status: 500 });
  }
}
