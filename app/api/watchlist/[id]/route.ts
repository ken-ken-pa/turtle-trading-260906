import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// DELETE: ウォッチリストから銘柄を削除
// Next.js 16: 動的ルートのparamsはPromiseで渡されるためawaitする
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await params;

    // 他ユーザーのレコードを誤って削除しないようuserIdも条件に含める
    const target = await prisma.watchlist.findFirst({ where: { id, userId } });
    if (!target) {
      return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    }

    await prisma.watchlist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist delete error:', error);
    return NextResponse.json({ error: 'Failed to delete symbol' }, { status: 500 });
  }
}

// PATCH: 実際の保有ポジション情報（取得単価・保有株数・取得日）を更新する
// body: { acquisitionPrice?: number | null, acquisitionShares?: number | null, acquisitionDate?: string | null }
// （キー自体が存在しないフィールドは変更しない。null または空文字を渡すと該当項目を未入力に戻す）
//
// 関連動作:
// - 更新後に3項目（取得単価・保有株数・取得日）が揃っており、かつ現在チェックが入っていなければ、
//   ダッシュボード表示チェック(dashboardSelected)を自動でONにする（一方向のみ。以後ユーザーが
//   手動でOFFにしても、この自動ONロジックが再度ONへ戻すことはない）
// - 3項目のいずれかが未入力に戻った場合は、単価損益・損益合計の計算根拠が失われるためnullに戻す
//   （3項目が再び揃った際は、次回の「最新シグナル取得」「Long Profit集計取得」実行時に再計算される）
// Next.js 16: 動的ルートのparamsはPromiseで渡されるためawaitする
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await params;

    const target = await prisma.watchlist.findFirst({ where: { id, userId } });
    if (!target) {
      return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      acquisitionPrice?: number | null;
      acquisitionShares?: number | null;
      acquisitionDate?: Date | null;
      unitProfit?: number | null;
      totalProfit?: number | null;
      dashboardSelected?: boolean;
    } = {};

    // 取得単価：正の整数のみ許容（小数・0・負数は不可）
    if (Object.prototype.hasOwnProperty.call(body, 'acquisitionPrice')) {
      const v = body.acquisitionPrice;
      if (v === null || v === '') {
        data.acquisitionPrice = null;
      } else {
        const n = Math.trunc(Number(v));
        if (!Number.isFinite(n) || n <= 0 || n !== Number(v)) {
          return NextResponse.json({ error: '取得単価は正の整数で入力してください' }, { status: 400 });
        }
        data.acquisitionPrice = n;
      }
    }

    // 保有株数：正の整数のみ許容
    if (Object.prototype.hasOwnProperty.call(body, 'acquisitionShares')) {
      const v = body.acquisitionShares;
      if (v === null || v === '') {
        data.acquisitionShares = null;
      } else {
        const n = Math.trunc(Number(v));
        if (!Number.isFinite(n) || n <= 0 || n !== Number(v)) {
          return NextResponse.json({ error: '保有株数は正の整数で入力してください' }, { status: 400 });
        }
        data.acquisitionShares = n;
      }
    }

    // 取得日：カレンダーからの日付文字列（YYYY-MM-DD）。空文字/nullで未入力に戻す
    if (Object.prototype.hasOwnProperty.call(body, 'acquisitionDate')) {
      const v = body.acquisitionDate;
      data.acquisitionDate = v ? new Date(v) : null;
    }

    // 更新後（今回の変更を反映した後）の3項目の状態を求める
    const nextPrice = Object.prototype.hasOwnProperty.call(data, 'acquisitionPrice')
      ? data.acquisitionPrice
      : target.acquisitionPrice;
    const nextShares = Object.prototype.hasOwnProperty.call(data, 'acquisitionShares')
      ? data.acquisitionShares
      : target.acquisitionShares;
    const nextDate = Object.prototype.hasOwnProperty.call(data, 'acquisitionDate')
      ? data.acquisitionDate
      : target.acquisitionDate;
    const isComplete = nextPrice != null && nextShares != null && nextDate != null;

    if (!isComplete) {
      // 3項目が揃わなくなった場合は、単価損益・損益合計の計算根拠が失われるため空欄に戻す
      data.unitProfit = null;
      data.totalProfit = null;
    } else if (!target.dashboardSelected) {
      // 3項目が新たに揃い、まだダッシュボード表示チェックが入っていなければ自動でON
      // （手動でOFFにされた後は、この自動ロジックで再度ONに戻すことはしない）
      data.dashboardSelected = true;
    }

    const updated = await prisma.watchlist.update({ where: { id }, data });

    return NextResponse.json({ watchlist: updated });
  } catch (error) {
    console.error('Watchlist acquisition update error:', error);
    return NextResponse.json({ error: 'Failed to update acquisition info' }, { status: 500 });
  }
}
