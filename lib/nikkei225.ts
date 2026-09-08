/**
 * 日経225構成銘柄の手動管理ロジック（J2案1）
 *
 * 日経225の構成銘柄は日本経済新聞社が算出・公表しており、
 * 機械可読な公式API/CSVは提供されていないため、
 * 「日経平均プロフィル」の構成銘柄一覧ページから取得したデータを
 * CSVとして管理画面からアップロードし、DBへ反映する方式とする。
 *
 * 銘柄入れ替えは例年4月・10月の年2回程度のため、更新頻度は低くて済む。
 *
 * 期待するCSVフォーマット（ヘッダー行必須、カンマ区切り、UTF-8）:
 *   symbol,name,sector
 *   7203,トヨタ自動車,輸送用機器
 *   ...
 */

import { PrismaClient } from "@prisma/client";

export interface Nikkei225Row {
  symbol: string;
  name: string;
  sector: string | null;
}

export class Nikkei225ImportError extends Error {}

/**
 * アップロードされたCSVテキストをパースする。
 * 件数チェック（225件程度）は警告のみで、厳密には強制しない
 * （入れ替え直後で件数が前後する可能性を許容するため）。
 */
export function parseNikkei225Csv(csvText: string): Nikkei225Row[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Nikkei225ImportError("CSVが空です");
  }

  const header = lines[0].split(",").map((h) => h.trim());
  const symbolIdx = header.indexOf("symbol");
  const nameIdx = header.indexOf("name");
  const sectorIdx = header.indexOf("sector");

  if (symbolIdx === -1 || nameIdx === -1) {
    throw new Nikkei225ImportError(
      "CSVのヘッダーに symbol, name 列が必要です（例: symbol,name,sector）"
    );
  }

  const rows: Nikkei225Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const rawSymbol = (cols[symbolIdx] ?? "").trim();
    const name = (cols[nameIdx] ?? "").trim();
    if (!rawSymbol || !name) continue;

    rows.push({
      symbol: rawSymbol.padStart(4, "0"),
      name,
      sector: sectorIdx !== -1 ? (cols[sectorIdx] ?? "").trim() || null : null,
    });
  }

  if (rows.length === 0) {
    throw new Nikkei225ImportError("有効なデータ行がありませんでした");
  }

  return rows;
}

export interface ImportNikkei225Result {
  parsedCount: number;
  upsertedCount: number;
  removedCount: number;
  warning: string | null;
}

/**
 * パース済みの日経225銘柄リストでDBを「完全に置き換える」。
 * 入れ替えのたびに銘柄が入れ替わるため、既存データを消して洗い替える方式が
 * 手動管理としては最もシンプルで事故が少ない。
 */
export async function replaceNikkei225(
  prisma: PrismaClient,
  rows: Nikkei225Row[]
): Promise<ImportNikkei225Result> {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.nikkei225Constituent.count();

    await tx.nikkei225Constituent.deleteMany({});

    await tx.nikkei225Constituent.createMany({
      data: rows.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        sector: r.sector,
      })),
    });

    return { before, after: rows.length };
  });

  const warning =
    rows.length !== 225
      ? `件数が225件ではありません（取込件数: ${rows.length}件）。入れ替え直後や誤ったファイルでないかご確認ください。`
      : null;

  return {
    parsedCount: rows.length,
    upsertedCount: result.after,
    removedCount: result.before,
    warning,
  };
}