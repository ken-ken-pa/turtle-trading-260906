import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  parseNikkei225Csv,
  replaceNikkei225,
  Nikkei225ImportError,
} from "@/lib/nikkei225";

/**
 * 日経225構成銘柄の手動インポート
 * body: { csv: string } を想定（管理画面のテキストエリア/ファイル読込から送信）
 *
 * データ元は「日経平均プロフィル」構成銘柄一覧ページを参照し、
 * symbol,name,sector 形式のCSVに整形してアップロードしてください。
 *
 * 260906: screening機能は廃止されましたが、このインポート処理自体は
 * ウォッチリストの初期セット（日経225全銘柄）を作るために引き続き必要です。
 * （旧 lib/screening/nikkei225.ts から lib/nikkei225.ts へ移設）
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let csv: string;
  try {
    const body = await req.json();
    csv = body.csv;
    if (typeof csv !== "string" || csv.trim().length === 0) {
      throw new Error("empty");
    }
  } catch {
    return NextResponse.json(
      { error: "リクエストボディに csv (文字列) が必要です" },
      { status: 400 }
    );
  }

  try {
    const rows = parseNikkei225Csv(csv);
    const result = await replaceNikkei225(prisma, rows);
    return NextResponse.json({
      message: "日経225構成銘柄を更新しました",
      ...result,
    });
  } catch (error) {
    if (error instanceof Nikkei225ImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[import-nikkei225] failed:", error);
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json(
      { error: `日経225の更新に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
