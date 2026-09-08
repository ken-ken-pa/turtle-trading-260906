import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { DEFAULT_STRATEGY_PARAMS, STRATEGY_PARAM_LIMITS, sanitizeParamValue } from '@/lib/turtleStrategy';

// GET: ログイン中ユーザーの設定を取得（無ければデフォルト値で初期作成）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    let settings = await prisma.userSetting.findUnique({ where: { userId } });

    if (!settings) {
      settings = await prisma.userSetting.create({
        data: {
          userId,
          entryDays: DEFAULT_STRATEGY_PARAMS.entryLength,
          exitDays: DEFAULT_STRATEGY_PARAMS.exitLength,
          atrDays: DEFAULT_STRATEGY_PARAMS.atrLength,
          interval: '1d',
          aggregationPeriod: '6mo',
          splitCount: 1,
          period: '6mo',
          watchlistSortDirection: 'desc',
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST: 設定を更新保存
// ── ウォッチリスト管理項目（全銘柄共通の“正”の設定） ──: entryDays, exitDays, atrDays, interval, aggregationPeriod
// ── ダッシュボード管理項目（見た目のみ） ──: splitCount, period
// ── 自動再取得（ブラウザ主導・1日1回） ──: autoRefreshTime
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const {
      entryDays,
      exitDays,
      atrDays,
      interval,
      aggregationPeriod,
      splitCount,
      period,
      autoRefreshTime,
      watchlistSortKey,
      watchlistSortDirection,
    } = body;

    const sanitizedEntryDays =
      entryDays !== undefined
        ? sanitizeParamValue(entryDays, DEFAULT_STRATEGY_PARAMS.entryLength, STRATEGY_PARAM_LIMITS.entryLength)
        : undefined;
    const sanitizedExitDays =
      exitDays !== undefined
        ? sanitizeParamValue(exitDays, DEFAULT_STRATEGY_PARAMS.exitLength, STRATEGY_PARAM_LIMITS.exitLength)
        : undefined;
    const sanitizedAtrDays =
      atrDays !== undefined
        ? sanitizeParamValue(atrDays, DEFAULT_STRATEGY_PARAMS.atrLength, STRATEGY_PARAM_LIMITS.atrLength)
        : undefined;

    // splitCountは全画面(1)/2分割(2)/4分割(4)の3値のみ許容
    const sanitizedSplitCount =
      splitCount !== undefined ? ([1, 2, 4].includes(Number(splitCount)) ? Number(splitCount) : 1) : undefined;

    const updated = await prisma.userSetting.upsert({
      where: { userId },
      update: {
        entryDays: sanitizedEntryDays,
        exitDays: sanitizedExitDays,
        atrDays: sanitizedAtrDays,
        interval,
        aggregationPeriod,
        splitCount: sanitizedSplitCount,
        period,
        autoRefreshTime,
        watchlistSortKey,
        watchlistSortDirection,
      },
      create: {
        userId,
        entryDays: sanitizedEntryDays ?? DEFAULT_STRATEGY_PARAMS.entryLength,
        exitDays: sanitizedExitDays ?? DEFAULT_STRATEGY_PARAMS.exitLength,
        atrDays: sanitizedAtrDays ?? DEFAULT_STRATEGY_PARAMS.atrLength,
        interval: interval ?? '1d',
        aggregationPeriod: aggregationPeriod ?? '6mo',
        splitCount: sanitizedSplitCount ?? 1,
        period: period ?? '6mo',
        autoRefreshTime: autoRefreshTime ?? null,
        watchlistSortKey: watchlistSortKey ?? null,
        watchlistSortDirection: watchlistSortDirection ?? 'desc',
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
