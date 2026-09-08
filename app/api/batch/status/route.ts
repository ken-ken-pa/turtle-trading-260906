import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: バッチジョブの進捗状況を取得（?jobId=...）
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobIdを指定してください' }, { status: 400 });
    }

    const job = await prisma.batchJob.findFirst({ where: { id: jobId, userId } });
    if (!job) {
      return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Batch status error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch job status' }, { status: 500 });
  }
}
