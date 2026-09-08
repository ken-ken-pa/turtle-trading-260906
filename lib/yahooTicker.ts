// JPXの4桁銘柄コードをyahoo-finance2で使うティッカー形式に変換する
// （旧 lib/screening/universe.ts の toYahooTicker と同一仕様。screening廃止に伴い共通ヘルパーとして独立）
export function toYahooTicker(symbol4: string): string {
  return `${symbol4}.T`;
}
