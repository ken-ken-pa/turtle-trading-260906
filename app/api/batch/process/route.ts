import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { processBatchJobChunk } from '@/lib/watchlist/engine';

// POST: バッチジョブを1チャンク分処理する（ブラウザ側Web Workerが1〜2秒間隔で呼び出す）
// body: { jobId: string }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const jobId: string = body?.jobId;
    if (!jobId) {
      return NextResponse.json({ error: 'jobIdを指定してください' }, { status: 400 });
    }

    const job = await processBatchJobChunk(prisma, jobId, userId);

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Batch process error:', error);
    return NextResponse.json({ error: 'Failed to process batch job' }, { status: 500 });
  }
}
