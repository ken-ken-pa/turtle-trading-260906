import { MarketCategory } from "@prisma/client";

// カテゴリ選択肢（J1: 排他選択）
export const CATEGORY_OPTIONS: { label: string; val: MarketCategory }[] = [
  { label: "日経225", val: "NIKKEI225" as MarketCategory },
  { label: "東証プライム", val: "PRIME" as MarketCategory },
  { label: "東証スタンダード", val: "STANDARD" as MarketCategory },
  { label: "東証グロース", val: "GROWTH" as MarketCategory },
];

// 期間選択肢（既存ダッシュボードのPERIOD_OPTIONSと同一の対応表, C1準拠）
export const SCREENING_PERIOD_OPTIONS = [
  { label: "1か月", val: "1mo" },
  { label: "3か月", val: "3mo" },
  { label: "6か月", val: "6mo" },
  { label: "1年", val: "1y" },
  { label: "3年", val: "3y" },
  { label: "最長", val: "max" },
];

// 絞り込み項目の定義（ラベル・入力単位表示用、レンジ入力フォームの生成に使用）
export const RANGE_FILTER_FIELDS: {
  key:
    | "employees"
    | "marketCap"
    | "enterpriseValue"
    | "fiftyTwoWeekHigh"
    | "fiftyTwoWeekLow"
    | "volume"
    | "averageVolume"
    | "beta"
    | "trailingPE"
    | "forwardPE"
    | "priceToBook"
    | "trailingEps"
    | "dividendYield"
    | "dividendRate"
    | "returnOnEquity"
    | "returnOnAssets"
    | "targetMeanPrice"
    | "targetHighPrice"
    | "targetLowPrice"
    | "recommendationMean"
    | "buyRecommendationRatio";
  label: string;
  group: "企業基本情報" | "株価・市場データ" | "評価・収益指標" | "アナリスト評価";
  hint?: string;
}[] = [
  { key: "employees", label: "従業員数", group: "企業基本情報" },
  { key: "marketCap", label: "時価総額（円）", group: "株価・市場データ" },
  { key: "enterpriseValue", label: "企業価値（円）", group: "株価・市場データ" },
  { key: "fiftyTwoWeekHigh", label: "52週高値（円）", group: "株価・市場データ" },
  { key: "fiftyTwoWeekLow", label: "52週安値（円）", group: "株価・市場データ" },
  { key: "volume", label: "出来高", group: "株価・市場データ" },
  { key: "averageVolume", label: "平均出来高", group: "株価・市場データ" },
  { key: "beta", label: "ベータ値", group: "株価・市場データ" },
  { key: "trailingPE", label: "PER（実績）", group: "評価・収益指標" },
  { key: "forwardPE", label: "PER（予想）", group: "評価・収益指標" },
  { key: "priceToBook", label: "PBR", group: "評価・収益指標" },
  { key: "trailingEps", label: "EPS（円）", group: "評価・収益指標" },
  { key: "dividendYield", label: "配当利回り", hint: "例: 0.03 = 3%", group: "評価・収益指標" },
  { key: "dividendRate", label: "配当額（円）", group: "評価・収益指標" },
  { key: "returnOnEquity", label: "ROE", hint: "例: 0.1 = 10%", group: "評価・収益指標" },
  { key: "returnOnAssets", label: "ROA", hint: "例: 0.05 = 5%", group: "評価・収益指標" },
  { key: "targetMeanPrice", label: "目標株価（平均・円）", group: "アナリスト評価" },
  { key: "targetHighPrice", label: "目標株価（最高・円）", group: "アナリスト評価" },
  { key: "targetLowPrice", label: "目標株価（最低・円）", group: "アナリスト評価" },
  { key: "recommendationMean", label: "推奨レーティング平均", hint: "1=Strong Buy 〜 5=Sell", group: "アナリスト評価" },
  { key: "buyRecommendationRatio", label: "買い推奨比率", hint: "0〜1（例: 0.6 = 60%）", group: "アナリスト評価" },
];

// テキスト一致で絞り込む項目
export const TEXT_FILTER_FIELDS: {
  key: "country" | "currency" | "exchange" | "sector" | "industry";
  label: string;
}[] = [
  { key: "country", label: "国・地域" },
  { key: "currency", label: "通貨" },
  { key: "exchange", label: "取引所" },
  { key: "sector", label: "セクター" },
  { key: "industry", label: "業界" },
];

// H2: 評価段階の推奨ポーリング間隔・銘柄数上限（画面側のデフォルト値）
export const EVAL_MODE_POLL_INTERVAL_MS = 1000;
export const PRODUCTION_MODE_POLL_INTERVAL_MS = 2500;

export const MAX_DESIGNATED_SYMBOLS = 20;
export const MAX_SAVED_CONDITIONS = 10;
export const MAX_SAVED_RUNS = 10;
