import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { BatchJobType } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { startBatchJob } from '@/lib/watchlist/engine';

// POST: バッチジョブ（最新シグナル取得 / Long Profit集計取得）を開始する
// body: { type: 'SIGNAL_FETCH' | 'PROFIT_AGGREGATION' }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const type: string = body?.type;
    if (type !== BatchJobType.SIGNAL_FETCH && type !== BatchJobType.PROFIT_AGGREGATION) {
      return NextResponse.json({ error: 'typeが不正です' }, { status: 400 });
    }

    const job = await startBatchJob(prisma, userId, type as BatchJobType);

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Batch start error:', error);
    return NextResponse.json({ error: 'Failed to start batch job' }, { status: 500 });
  }
}
