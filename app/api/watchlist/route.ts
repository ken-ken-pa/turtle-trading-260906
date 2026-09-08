// Next.js の NextResponse をインポート
import { NextResponse } from 'next/server';
// NextAuthのgetServerSession関数をインポート
import { getServerSession } from 'next-auth';
// 認証設定オプションをインポート
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
// PrismaClient インスタンスをインポート
import { prisma } from '@/lib/prisma';
// ウォッチリスト初期シード処理をインポート
import { ensureWatchlistSeeded } from '@/lib/watchlist/seed';

// Next.js 16のキャッシュ最適化により、このAPIの応答がキャッシュされて
// 古いデータ（並び順など）が返り続けることを防ぐため、常に動的実行・キャッシュ無効にする
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: ログイン中ユーザーのウォッチリスト一覧（最新シグナル付き、sortOrder順）を取得
// 初回アクセス（0件）の場合は日経225全銘柄で自動初期化する
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // 初回のみ日経225全銘柄で初期化（既に1件でもあれば何もしない）
    await ensureWatchlistSeeded(prisma, userId);

    const list = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ watchlist: list });
  } catch (error) {
    console.error('Watchlist fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

// POST: 銘柄を末尾に追加（任意銘柄の追加。日経225以外も可）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const symbol: string | undefined = body?.symbol;
    const name: string | undefined = body?.name;

    if (!symbol) {
      return NextResponse.json({ error: '証券コードを指定してください' }, { status: 400 });
    }

    const existing = await prisma.watchlist.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });
    if (existing) {
      return NextResponse.json({ error: '既にウォッチリストに登録されています' }, { status: 409 });
    }

    const maxOrder = await prisma.watchlist.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const created = await prisma.watchlist.create({
      data: {
        userId,
        symbol,
        name: name ?? symbol,
        sortOrder: nextOrder,
      },
    });

    return NextResponse.json({ watchlist: created });
  } catch (error) {
    console.error('Watchlist add error:', error);
    return NextResponse.json({ error: 'Failed to add symbol' }, { status: 500 });
  }
}
