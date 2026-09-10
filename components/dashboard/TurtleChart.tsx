// クライアントサイドでのレンダリングを指定
'use client';

// Reactから各種フック関数をインポート
import { useEffect, useRef, useState, useCallback } from 'react';
// lightweight-chartsからチャート描画に必要な型と関数をインポート
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  TickMarkType,
} from 'lightweight-charts';

// 銘柄マスターデータの定数配列を定義
export const STOCK_MASTER = [
  // 東京エレクトロンの銘柄情報
  { symbol: '8035.T', code: '8035', name: '東京エレクトロン', nameEn: 'TOKYO ELECTRON' },
  // アドバンテストの銘柄情報
  { symbol: '6857.T', code: '6857', name: 'アドバンテスト', nameEn: 'ADVANTEST' },
  // ソフトバンクグループの銘柄情報
  { symbol: '9984.T', code: '9984', name: 'ソフトバンクグループ', nameEn: 'SOFTBANK GROUP' },
  // ソニーグループの銘柄情報
  { symbol: '6758.T', code: '6758', name: 'ソニーグループ', nameEn: 'SONY GROUP' },
  // トヨタ自動車の銘柄情報
  { symbol: '7203.T', code: '7203', name: 'トヨタ自動車', nameEn: 'TOYOTA MOTOR' },
  // 日立製作所の銘柄情報
  { symbol: '6501.T', code: '6501', name: '日立製作所', nameEn: 'HITACHI' },
  // ファーストリテイリングの銘柄情報
  { symbol: '9983.T', code: '9983', name: 'ファーストリテイリング', nameEn: 'FAST RETAILING' },
  // 三菱重工業の銘柄情報
  { symbol: '7011.T', code: '7011', name: '三菱重工業', nameEn: 'MITSUBISHI HEAVY' },
  // レーザーテックの銘柄情報
  { symbol: '6920.T', code: '6920', name: 'レーザーテック', nameEn: 'LASERTEC' },
  // ディスコの銘柄情報
  { symbol: '6146.T', code: '6146', name: 'ディスコ', nameEn: 'DISCO' },
  // 三菱UFJフィナンシャルGの銘柄情報
  { symbol: '8306.T', code: '8306', name: '三菱UFJフィナンシャルG', nameEn: 'MUFG' },
  // 三井住友フィナンシャルGの銘柄情報
  { symbol: '8316.T', code: '8316', name: '三井住友フィナンシャルG', nameEn: 'SMFG' },
  // みずほフィナンシャルGの銘柄情報
  { symbol: '8411.T', code: '8411', name: 'みずほフィナンシャルG', nameEn: 'MIZUHO' },
  // 三菱商事の銘柄情報
  { symbol: '8058.T', code: '8058', name: '三菱商事', nameEn: 'MITSUBISHI CORP' },
  // 伊藤忠商事の銘柄情報
  { symbol: '8001.T', code: '8001', name: '伊藤忠商事', nameEn: 'ITOCHU' },
  // 三井物産の銘柄情報
  { symbol: '8031.T', code: '8031', name: '三井物産', nameEn: 'MITSUI & CO' },
  // 任天堂の銘柄情報
  { symbol: '7974.T', code: '7974', name: '任天堂', nameEn: 'NINTENDO' },
  // 信越化学工業の銘柄情報
  { symbol: '4063.T', code: '4063', name: '信越化学工業', nameEn: 'SHIN-ETSU CHEMICAL' },
  // 富士通の銘柄情報
  { symbol: '6702.T', code: '6702', name: '富士通', nameEn: 'FUJITSU' },
  // HOYAの銘柄情報
  { symbol: '7741.T', code: '7741', name: 'HOYA', nameEn: 'HOYA' },
  // 安川電機の銘柄情報
  { symbol: '6506.T', code: '6506', name: '安川電機', nameEn: 'YASKAWA' },
  // ダイキン工業の銘柄情報
  { symbol: '6367.T', code: '6367', name: 'ダイキン工業', nameEn: 'DAIKIN' },
  // 武田薬品工業の銘柄情報
  { symbol: '4502.T', code: '4502', name: '武田薬品工業', nameEn: 'TAKEDA' },
  // 第一三共の銘柄情報
  { symbol: '4568.T', code: '4568', name: '第一三共', nameEn: 'DAIICHI SANKYO' },
  // 日本電信電話の銘柄情報
  { symbol: '9432.T', code: '9432', name: '日本電信電話', nameEn: 'NTT' },
  // KDDIの銘柄情報
  { symbol: '9433.T', code: '9433', name: 'KDDI', nameEn: 'KDDI' },
  // 本田技研工業の銘柄情報
  { symbol: '7267.T', code: '7267', name: '本田技研工業', nameEn: 'HONDA' },
  // デンソーの銘柄情報
  { symbol: '6902.T', code: '6902', name: 'デンソー', nameEn: 'DENSO' },
  // リクルートHDの銘柄情報
  { symbol: '6098.T', code: '6098', name: 'リクルートHD', nameEn: 'RECRUIT' },
  // 川崎重工業の銘柄情報
  { symbol: '7012.T', code: '7012', name: '川崎重工業', nameEn: 'KAWASAKI HEAVY' },
  // IHIの銘柄情報
  { symbol: '7013.T', code: '7013', name: 'IHI', nameEn: 'IHI' },
// 配列定義の終了
];

// コンポーネントのPropsインターフェース定義
interface TurtleChartProps {
  // 初期表示の銘柄コード（省略可能・symbol未指定時のフォールバック用）
  initialSymbol?: string;
  // 親から制御される現在の銘柄コード（省略時は内部状態のみで動作）
  symbol?: string;
  // 銘柄コードが変更された際に親へ通知するコールバック（ユーザー設定保存用）
  onSymbolChange?: (symbol: string) => void;
  // チャート番号インデックス（省略可能）
  index?: number;
  // 表示期間
  period: string;
  // 足種別
  interval: string;
  // エントリー期間（省略時はサーバー側デフォルト値=20日）
  entryDays?: number;
  // 手仕舞い期間（省略時はサーバー側デフォルト値=10日）
  exitDays?: number;
  // ATR期間（省略時はサーバー側デフォルト値=20日）
  atrDays?: number;
  // チャート位置のドラッグ開始時に呼び出されるコールバック（並び替え用）
  onDragHandleStart?: () => void;
  // チャート位置のドラッグ終了時に呼び出されるコールバック（並び替え用）
  onDragHandleEnd?: () => void;
  // チャートカードのダブルクリック時に呼び出されるコールバック（画面分割を全画面にして当該チャートを表示するため）
  onChartDoubleClick?: () => void;
  // 表示中の銘柄一覧の中で同一銘柄が複数枠に存在するか（旧screening機能の名残。260906では常にfalseで使用）
  isDuplicate?: boolean;
  // 銘柄の検索・変更UIを表示するか（260906: ダッシュボード側の銘柄検索欄は廃止のためfalseで使用。
  // 銘柄はウォッチリストのチェック選択で決まるため、ここでは表示専用の企業名バッジのみ残す）
  symbolEditable?: boolean;
  // 保有ポジションの取得単価（ウォッチリストで手入力された値）。指定時はチャートにピンク色の横線を描画する
  acquisitionPrice?: number | null;
  // 保有ポジションの取得日（ウォッチリストで手入力された値）。指定時はチャートにピンク色の点線縦線を描画する
  acquisitionDate?: string | null;
  // ドラッグ&ドロップによるチャート位置の並べ替えを許可するか（ウォッチリストで列ソートが有効な間はfalse）
  dragEnabled?: boolean;
}

// シグナルデータのインターフェース定義
interface SignalItem {
  // 日付文字列
  time: string;
  // シグナルの種別（エントリー/手仕舞い）
  type: 'LONG_ENTRY' | 'EXIT_LONG';
  // 価格
  price: number;
}

// オーバーレイ描画用バッジのインターフェース定義
interface RenderBadge {
  // バッジ識別用ユニークID
  id: string;
  // X座標ピクセル値
  x: number;
  // シグナル種別
  type: 'LONG_ENTRY' | 'EXIT_LONG';
  // フォーマット済み価格文字列
  priceStr: string;
}

// 日付文字列をYYYY-MM-DD形式に正規化する関数
const normalizeDate = (timeStr: string | any): string => {
  // 文字列型へ変換
  const s = String(timeStr);
  // 10文字以上の場合は先頭10文字を抽出して返却
  return s.length >= 10 ? s.slice(0, 10) : s;
};

// DateオブジェクトをYYYY-MM-DD文字列にフォーマットする関数
const formatDateToYYYYMMDD = (d: Date): string => {
  // 年を取得
  const year = d.getFullYear();
  // 月を取得し2桁埋め
  const month = String(d.getMonth() + 1).padStart(2, '0');
  // 日を取得し2桁埋め
  const day = String(d.getDate()).padStart(2, '0');
  // ハイフン区切りで結合して返却
  return `${year}-${month}-${day}`;
};

// 指定期間に応じた正確な開始日を算出する関数
const calculateFromDate = (latestDateStr: string, periodVal: string): string => {
  // ハイフンで分解し数値に変換
  const [year, month, day] = latestDateStr.split('-').map(Number);
  // 基準日となるDateオブジェクトを作成
  const targetDate = new Date(year, month - 1, day);

  // 期間設定値による条件分岐
  switch (periodVal) {
    // 1か月前を計算
    case '1mo':
      targetDate.setMonth(targetDate.getMonth() - 1);
      break;
    // 3か月前を計算
    case '3mo':
      targetDate.setMonth(targetDate.getMonth() - 3);
      break;
    // 6か月前を計算
    case '6mo':
      targetDate.setMonth(targetDate.getMonth() - 6);
      break;
    // 1年前を計算
    case '1y':
      targetDate.setFullYear(targetDate.getFullYear() - 1);
      break;
    // 3年前を計算
    case '3y':
      targetDate.setFullYear(targetDate.getFullYear() - 3);
      break;
    // デフォルトは6か月前を計算
    default:
      targetDate.setMonth(targetDate.getMonth() - 6);
      break;
  }

  // 計算した日付を文字列形式で返却
  return formatDateToYYYYMMDD(targetDate);
};

// 表示用に銘柄コード末尾の「.T」（東証サフィックス）を除去する関数
const stripSuffix = (s: string): string => s.replace(/\.T$/i, '');

// タートルチャート描画メインコンポーネント
export default function TurtleChart({
  initialSymbol = '8035.T',
  symbol,
  onSymbolChange,
  index = 0,
  period,
  interval,
  entryDays,
  exitDays,
  atrDays,
  onDragHandleStart,
  onDragHandleEnd,
  onChartDoubleClick,
  isDuplicate = false,
  symbolEditable = true,
  acquisitionPrice = null,
  acquisitionDate = null,
  dragEnabled = true,
}: TurtleChartProps) {
  // 現在の銘柄コードのステート（親からsymbolが渡されていればそれを優先／Yahoo Finance用に.T付きで保持）
  const [currentSymbol, setCurrentSymbol] = useState<string>(symbol || initialSymbol);
  // 入力フォーム値のステート（.Tを含む実際の銘柄コードをそのまま表示）
  const [inputVal, setInputVal] = useState<string>(symbol || initialSymbol);

  // 親から渡される銘柄コードが変化した場合（ユーザー設定の非同期読み込み完了時など）に同期
  useEffect(() => {
    // symbolが未指定、または既に一致している場合は何もしない
    if (!symbol || symbol === currentSymbol) return;
    // 現在の銘柄コードを親の値に同期
    setCurrentSymbol(symbol);
    // 入力欄の表示も同期
    setInputVal(symbol);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  // 検索サジェスト表示の開閉ステート
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  // APIから取得した企業名のステート
  const [apiCompanyName, setApiCompanyName] = useState<string>('');
  // Yahoo Financeの銘柄検索APIから取得した候補一覧のステート
  const [apiSuggestions, setApiSuggestions] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  // チャートデータ読み込みエラーメッセージのステート（無効な証券コード等）
  const [loadError, setLoadError] = useState<string>('');

  // 検索ボックスのDOM要素参照
  const searchContainerRef = useRef<HTMLDivElement>(null);
  // 銘柄コード入力欄のDOM要素参照（✕クリア後のフォーカス制御用）
  const symbolInputRef = useRef<HTMLInputElement>(null);
  // チャートコンテナのDOM要素参照
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // チャートインスタンスの参照
  const chartRef = useRef<IChartApi | null>(null);
  // ローソク足シリーズの参照（取得単価の縦座標(Y座標)算出に使用）
  const candlestickSeriesRef = useRef<any>(null);
  // シグナル一覧データの参照
  const signalsRef = useRef<SignalItem[]>([]);
  // 画面描画対象バッジ配列のステート
  const [renderedBadges, setRenderedBadges] = useState<RenderBadge[]>([]);
  // 価格軸の横幅ピクセル値のステート
  const [priceScaleWidth, setPriceScaleWidth] = useState<number>(65);
  // 取得日の縦線描画X座標ピクセル値のステート（表示範囲外の場合はnull＝非表示）
  const [acquisitionLineX, setAcquisitionLineX] = useState<number | null>(null);
  // 取得単価の横線描画Y座標ピクセル値のステート（左端ラベル表示位置の算出に使用）
  const [acquisitionPriceY, setAcquisitionPriceY] = useState<number | null>(null);

  // 入力値に基づくローカル銘柄マスターのサジェストリストのフィルタリング処理
  const localSuggestions = STOCK_MASTER.filter((item) => {
    // 入力文字を大文字変換して前後の空白を除去
    const q = inputVal.trim().toUpperCase();
    // 入力が空の場合は全件表示対象
    if (!q) return true;
    // コード・シンボル・名称にマッチするか判定
    return (
      item.code.includes(q) ||
      item.symbol.toUpperCase().includes(q) ||
      item.name.includes(q) ||
      item.nameEn.toUpperCase().includes(q)
    );
  });

  // Yahoo Finance検索APIの候補をローカル候補と同じ形式に整形
  const remoteSuggestions = apiSuggestions
    // ローカル候補と重複する銘柄は除外
    .filter((q) => !localSuggestions.some((item) => item.symbol.toUpperCase() === q.symbol.toUpperCase()))
    .map((q) => ({
      symbol: q.symbol,
      code: stripSuffix(q.symbol),
      name: q.name,
      nameEn: q.exchange || '',
    }));

  // ローカル候補とAPI候補を統合し先頭8件に制限
  const suggestions = [...localSuggestions, ...remoteSuggestions].slice(0, 8);

  // 入力中の証券コードに応じてYahoo Finance検索APIから候補を取得（デバウンス処理）
  useEffect(() => {
    // 入力欄が閉じている、または入力が空の場合は候補を取得しない
    const q = inputVal.trim();
    if (!isDropdownOpen || !q) {
      setApiSuggestions([]);
      return;
    }
    // 300ms のデバウンスタイマー
    const timer = setTimeout(() => {
      // 銘柄検索APIを呼び出し（ウォッチリスト管理と同様、東証銘柄・海外ティッカーの両方を候補対象とする）
      fetch(`/api/symbol-lookup?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { quotes: [] }))
        .then((data) => {
          setApiSuggestions(data.quotes || []);
        })
        .catch(() => {
          // 検索失敗時は候補なしとして扱う（画面のエラー表示はしない）
          setApiSuggestions([]);
        });
    }, 300);
    // タイマークリーンアップ
    return () => clearTimeout(timer);
  }, [inputVal, isDropdownOpen]);

  // 表示用企業名を取得する関数
  const getDisplayCompanyName = () => {
    // マスターデータから一致する銘柄を検索
    const matched = STOCK_MASTER.find(
      (m) =>
        m.symbol.toUpperCase() === currentSymbol.toUpperCase() ||
        m.code === stripSuffix(currentSymbol)
    );
    // マッチした場合はその名称を返却
    if (matched) return matched.name;
    // マッチしない場合はAPI取得名または銘柄コード（.T含む）を返却
    return apiCompanyName || currentSymbol;
  };

  // 銘柄検索の実行処理関数
  const executeSearch = (targetSymbol: string) => {
    // 前後空白を除去し大文字に統一
    const trimmed = targetSymbol.trim().toUpperCase();
    // 空文字の場合は何もしない
    if (!trimmed) return;
    // 数字4桁のみの入力は東証銘柄の省略入力とみなし末尾に.Tを付与、それ以外（海外ティッカー・既に.T付き等）はそのまま利用
    const formatted = /^\d{4}$/.test(trimmed) ? `${trimmed}.T` : trimmed;
    // 入力値を更新（.Tを含む実際の銘柄コードをそのまま表示）
    setInputVal(formatted);
    // 読み込みエラー表示をクリア
    setLoadError('');
    // API取得済み企業名をリセット（新しい銘柄のデータ取得を待つ）
    setApiCompanyName('');
    // 現在の銘柄ステートを更新（Yahoo Finance問い合わせ用に.T付きで保持）
    setCurrentSymbol(formatted);
    // ドロップダウンを非表示
    setIsDropdownOpen(false);
    // 親コンポーネントへ銘柄変更を通知（ユーザー設定への保存用）
    if (onSymbolChange) onSymbolChange(formatted);
  };

  // 外部クリック検知によるドロップダウン非表示処理
  useEffect(() => {
    // クリックイベントハンドラー定義
    const handleClickOutside = (event: MouseEvent) => {
      // 検索エリア外のクリックか判定
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        // ドロップダウンを閉じる
        setIsDropdownOpen(false);
      }
    };
    // イベントリスナーを登録
    document.addEventListener('mousedown', handleClickOutside);
    // クリーンアップ時にイベントリスナーを解除
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // バッジと縦線の描画位置を更新する関数
  const updateOverlayPositions = useCallback(() => {
    // チャートまたはコンテナが存在しない場合は処理を中断
    if (!chartRef.current || !chartContainerRef.current) return;

    // 時間軸オブジェクトを取得
    const timeScale = chartRef.current.timeScale();
    // コンテナ幅を取得
    const containerWidth = chartContainerRef.current.clientWidth;
    // 右側の価格軸の幅を取得
    const pWidth = chartRef.current.priceScale('right').width();
    // 幅が存在する場合はステート更新
    if (pWidth > 0) {
      setPriceScaleWidth(pWidth);
    }

    // 新規バッジ配列を用意
    const badges: RenderBadge[] = [];

    // 保持しているシグナルデータ分ループ処理
    for (let idx = 0; idx < signalsRef.current.length; idx++) {
      // 対象シグナルを取得
      const sig = signalsRef.current[idx];
      // 日付から画面上のX座標を計算
      const coordinate = timeScale.timeToCoordinate(normalizeDate(sig.time) as any);

      // 画面表示範囲内にあるか判定
      if (coordinate !== null && coordinate >= -100 && coordinate <= containerWidth) {
        // 描画対象バッジ配列へ追加
        badges.push({
          id: `${sig.time}-${sig.type}-${idx}`,
          x: coordinate,
          type: sig.type,
          priceStr: sig.price.toLocaleString('ja-JP', { maximumFractionDigits: 2 }),
        });
      }
    }

    // バッジ描画用ステートを更新
    setRenderedBadges(badges);

    // 取得日（保有ポジション情報）の縦線描画位置を計算
    if (acquisitionDate) {
      const coordinate = timeScale.timeToCoordinate(normalizeDate(acquisitionDate) as any);
      if (coordinate !== null && coordinate >= -100 && coordinate <= containerWidth) {
        setAcquisitionLineX(coordinate);
      } else {
        setAcquisitionLineX(null);
      }
    } else {
      setAcquisitionLineX(null);
    }

    // 取得単価（保有ポジション情報）の横線描画Y座標を計算（左端ラベル表示位置に使用）
    if (acquisitionPrice != null && candlestickSeriesRef.current) {
      const y = candlestickSeriesRef.current.priceToCoordinate(acquisitionPrice);
      setAcquisitionPriceY(y);
    } else {
      setAcquisitionPriceY(null);
    }
  }, [acquisitionDate, acquisitionPrice]);

  // チャート初期化とデータ読み込みのエフェクト処理
  useEffect(() => {
    // チャート用コンテナが存在しなければ終了
    if (!chartContainerRef.current) return;

    // 既存のチャート参照があれば破棄して初期化
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // このuseEffect実行に固有の破棄済みフラグ（クロージャで捕捉した古いchart/seriesへの
    // 非同期コールバックからのアクセスを防ぐため。chartRef.currentだけでは、エフェクト再実行で
    // 別の新しいチャートに差し替わったケースを検出できず「Object is disposed」エラーの原因となる）
    let isDisposed = false;

    // 新しいデータ取得開始にあたり、前回のエラー表示をクリア
    setLoadError('');

    // チャートインスタンス生成と設定
    const chart = createChart(chartContainerRef.current, {
      // 自動サイズ調整有効化
      autoSize: true,
      // レイアウト設定
      layout: {
        background: { type: ColorType.Solid, color: '#0B0F19' },
        textColor: '#94A3B8',
      },
      // グリッド線設定
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      // 十字カーソル設定
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      // 右側価格軸設定
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      // 時間軸設定
      timeScale: {
        borderColor: '#334155',
        visible: true,
        timeVisible: false,
        secondsVisible: false,
        // 横軸の目盛りテキストフォーマッタ
        tickMarkFormatter: (time: any, tickMarkType: TickMarkType) => {
          // 日時が取得できない場合は空文字
          if (!time) return '';
          // 日付文字列を取得
          const dateStr = typeof time === 'string' ? time : time.year ? `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}` : '';
          // 取得できない場合はそのまま返す
          if (!dateStr) return '';
          // 年月日に分解
          const parts = dateStr.split('-');
          // フォーマット不可の場合はそのまま返す
          if (parts.length < 3) return dateStr;
          // 年を取得
          const year = parts[0];
          // 月を取得
          const month = parseInt(parts[1], 10);
          // 日を取得
          const day = parseInt(parts[2], 10);

          // 目盛りの種別ごとに日本語表示を割り当て
          switch (tickMarkType) {
            // 年の表示
            case TickMarkType.Year:
              return `${year}年`;
            // 月の表示
            case TickMarkType.Month:
              return `${month}月`;
            // 日の表示
            case TickMarkType.DayOfMonth:
              return `${day}日`;
            // デフォルトは月表示
            default:
              return `${month}月`;
          }
        },
      },
      // ロケール・日付フォーマット設定
      localization: {
        locale: 'ja-JP',
        dateFormat: 'yyyy/MM/dd',
        // ツールチップ用日付表示フォーマッタ
        timeFormatter: (time: any) => {
          // 文字列型の場合はスラッシュ区切りへ置換
          if (typeof time === 'string') return time.replace(/-/g, '/');
          // オブジェクト型の場合は年月日をフォーマットして返却
          if (time && time.year) {
            return `${time.year}/${String(time.month).padStart(2, '0')}/${String(time.day).padStart(2, '0')}`;
          }
          return '';
        },
      },
    });

    // チャート参照を保存
    chartRef.current = chart;

    // ローソク足シリーズを追加
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderUpColor: '#10B981',
      borderDownColor: '#F43F5E',
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // ローソク足シリーズの参照を保存（取得単価のY座標算出に使用）
    candlestickSeriesRef.current = candlestickSeries;

    // 保有ポジションの取得単価をピンク色の横線として描画（未入力の場合は描画しない）。
    // 右側の価格軸ラベルは非表示にし、代わりにチャート左端へカスタムラベルを表示する（updateOverlayPositions参照）
    if (acquisitionPrice != null) {
      candlestickSeries.createPriceLine({
        price: acquisitionPrice,
        color: '#EC4899',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: false,
        title: '',
      });
    }

    // アッパーブレイクアウトラインシリーズを追加
    const upperSeries = chart.addLineSeries({
      color: '#2563EB',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // ロワーブレイクアウトラインシリーズを追加
    const lowerSeries = chart.addLineSeries({
      color: '#2563EB',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // トレンドラインシリーズを追加
    const trendSeries = chart.addLineSeries({
      color: '#EAB308',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // 手仕舞いラインシリーズを追加
    const exitSeries = chart.addLineSeries({
      color: '#38BDF8',
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // ストップラインシリーズを追加
    const stopSeries = chart.addLineSeries({
      color: '#EAB308',
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // スクロール・ズーム操作時にオーバーレイ位置を再計算
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      requestAnimationFrame(() => {
        // このチャートが既に破棄済みの場合は何もしない
        if (isDisposed) return;
        updateOverlayPositions();
      });
    });

    // 期間3年や最長でも十分な全過去データ（max）を明示的にリクエストして取得（戦略パラメータも指定）
    const strategyParams = new URLSearchParams({
      symbol: currentSymbol,
      period: 'max',
      interval,
    });
    // エントリー期間が指定されている場合のみクエリに追加（未指定時はサーバー側デフォルト値を使用）
    if (entryDays !== undefined) strategyParams.set('entryDays', String(entryDays));
    // 手仕舞い期間
    if (exitDays !== undefined) strategyParams.set('exitDays', String(exitDays));
    // ATR期間
    if (atrDays !== undefined) strategyParams.set('atrDays', String(atrDays));

    fetch(`/api/stock?${strategyParams.toString()}`)
      .then(async (res) => {
        // レスポンスをJSONとしてパース（エラー時も本文にメッセージが含まれる想定）
        const body = await res.json().catch(() => ({}));
        // ステータス異常時は例外を投げずにエラー内容を付与して返却
        if (!res.ok) {
          return { __error: body?.error || `証券コード「${currentSymbol}」のデータを取得できませんでした。` };
        }
        // 正常時はそのままデータを返却
        return body;
      })
      .then((data) => {
        // このチャートが既に破棄済み（別のチャートに差し替わった、またはアンマウント済み）の場合は
        // 古いchart/seriesへアクセスしてしまうため処理を中断
        if (isDisposed) return;
        // 念のためchartRef.currentの存在も確認（アンマウント時の保険）
        if (!chartRef.current) return;

        // APIからエラーが返却された場合（無効な証券コード等）
        if (data.__error) {
          // 画面表示用のエラーメッセージを設定（コンソールへは出力しない＝開発オーバーレイを発生させない）
          setLoadError(data.__error);
          return;
        }

        // 企業名が存在する場合はステート更新
        if (data.companyName) {
          setApiCompanyName(data.companyName);
        }

        // ローソク足データが存在する場合の描画処理
        if (data.candles && data.candles.length > 0) {
          // 日付フォーマットを統一
          const formattedCandles = data.candles.map((item: any) => ({
            ...item,
            time: normalizeDate(item.time),
          }));

          // ラインデータの日付フォーマット統一用ヘルパー
          const formatLineData = (lines: any[]) =>
            lines.map((item: any) => ({
              ...item,
              time: normalizeDate(item.time),
            }));

          // 各シリーズにデータを設定
          candlestickSeries.setData(formattedCandles);
          if (data.upperLines) upperSeries.setData(formatLineData(data.upperLines));
          if (data.lowerLines) lowerSeries.setData(formatLineData(data.lowerLines));
          if (data.trendLines) trendSeries.setData(formatLineData(data.trendLines));
          if (data.exitLines) exitSeries.setData(formatLineData(data.exitLines));
          if (data.stopLines) stopSeries.setData(formatLineData(data.stopLines));

          // シグナル一覧データを参照に保存
          signalsRef.current = data.signals || [];

          // 最長表示の場合は全データ範囲を画面いっぱいに収める
          if (period === 'max' || period === '最長') {
            chart.timeScale().fitContent();
          } else {
            // 最新データの日付を取得
            const latestCandle = formattedCandles[formattedCandles.length - 1];
            // 最古データの日付を取得
            const oldestCandle = formattedCandles[0];
            // 基準日となる日付文字列を確定
            const latestDateStr = latestCandle ? latestCandle.time : formatDateToYYYYMMDD(new Date());

            // 指定期間（1mo, 3mo, 6mo, 1y, 3y）に応じた開始日付を算出
            let fromDateStr = calculateFromDate(latestDateStr, period);

            // 算出された開始日付が最古データより古い場合は最古データの日付を割り当て
            if (oldestCandle && fromDateStr < oldestCandle.time) {
              fromDateStr = oldestCandle.time;
            }

            // 正確な日付範囲で時間軸の表示領域を設定（3年分があれば3年前まで表示）
            chart.timeScale().setVisibleRange({
              from: fromDateStr as any,
              to: latestDateStr as any,
            });
          }

          // オーバーレイバッジの位置を遅延更新
          setTimeout(() => {
            // 遅延実行時点で既に破棄済みの場合は何もしない
            if (isDisposed) return;
            updateOverlayPositions();
          }, 100);
        }
      })
      .catch(() => {
        // ネットワーク断等の予期せぬ失敗時も画面上にエラー表示するのみ（開発オーバーレイは発生させない）
        // 破棄済みの場合は古いchartへの参照を伴うsetLoadErrorも不要なため何もしない
        if (!isDisposed && chartRef.current) {
          setLoadError(`証券コード「${currentSymbol}」のデータを取得できませんでした。`);
        }
      });

    // コンテナのリサイズ監視オブジェクト作成
    const resizeObserver = new ResizeObserver(() => {
      // サイズ変更時にオーバーレイ位置を更新
      updateOverlayPositions();
    });

    // コンテナ要素の監視を開始
    resizeObserver.observe(chartContainerRef.current);

    // エフェクト解放時のクリーンアップ処理
    return () => {
      // このエフェクト実行に紐づく非同期コールバックを以後すべて無効化
      isDisposed = true;
      // リサイズ監視の解除
      resizeObserver.disconnect();
      // チャートインスタンスの破棄
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [
    currentSymbol,
    period,
    interval,
    entryDays,
    exitDays,
    atrDays,
    acquisitionPrice,
    acquisitionDate,
    updateOverlayPositions,
  ]);

  // コンポーネントの描画UI要素を返却
  return (
    // 外枠カードコンテナ
    <div
      className="h-full w-full flex flex-col bg-[#0B0F19] rounded-xl border border-slate-800/80 shadow-2xl p-2.5 overflow-hidden relative"
      onDoubleClick={onChartDoubleClick}
    >
      {/* 銘柄検索・情報表示ヘッダーエリア */}
      <div className="flex-none flex items-center justify-between pb-2 mb-1.5 border-b border-slate-800/60 relative z-30">
        {/* 左側操作グループ */}
        <div className="flex items-center gap-2">
          {/* チャート番号インデックス（ドラッグハンドル：ドラッグしてチャートの位置を並び替え。
              ウォッチリストで列ソートが有効な間は、意味のある並べ替えができないため無効化する） */}
          <span
            draggable={dragEnabled}
            onDragStart={(e) => {
              if (!dragEnabled) return;
              // ドラッグ操作を「移動」として指定
              e.dataTransfer.effectAllowed = 'move';
              // 親コンポーネントへドラッグ開始を通知
              onDragHandleStart?.();
            }}
            onDragEnd={() => {
              // 親コンポーネントへドラッグ終了を通知（ドロップが成立しなかった場合の状態リセット用）
              onDragHandleEnd?.();
            }}
            title={
              dragEnabled
                ? 'ドラッグしてチャートの位置を並び替え'
                : 'ウォッチリストでソート中はドラッグでの並び替えはできません'
            }
            className={`text-xs font-mono font-bold select-none px-1 -ml-1 transition ${
              dragEnabled
                ? 'text-slate-500 cursor-grab active:cursor-grabbing hover:text-slate-300'
                : 'text-slate-700 cursor-not-allowed'
            }`}
          >
            ⠿ #{index + 1}
          </span>

          {/* Long Profit集計反映時の重複マーク（トップ20と指定銘柄の両方に選ばれた銘柄） */}
          {isDuplicate && (
            <span
              title="トップ20と指定銘柄の両方に該当する銘柄です"
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 font-bold select-none"
            >
              重複
            </span>
          )}

          {/* 検索入力フィールド用位置固定コンテナ（ダブルクリック時は全画面化トリガーを伝播させない＝銘柄検索欄を除く） */}
          {/* 260906: 銘柄はウォッチリストのチェック選択で決まるため、ダッシュボード側での検索・変更は廃止。
              symbolEditable=falseの場合は入力欄・検索ボタンごと非表示にする */}
          {symbolEditable && (
            <>
              <div className="relative" ref={searchContainerRef} onDoubleClick={(e) => e.stopPropagation()}>
                {/* 銘柄コード/企業名入力インプット */}
                <input
                  ref={symbolInputRef}
                  type="text"
                  value={inputVal}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      executeSearch(inputVal);
                    }
                  }}
                  className="w-24 pl-2.5 pr-6 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-blue-500 transition placeholder:text-slate-600 shadow-inner"
                  placeholder="コード/企業名"
                />

                {/* クリアボタン（✕）：入力中の文字列のみを消去し、選択済みチャートの銘柄自体はそのまま維持する */}
                {inputVal && (
                  <button
                    type="button"
                    onClick={() => {
                      // 入力欄の文字列をクリア
                      setInputVal('');
                      // クリア後は候補を全件表示するためドロップダウンを開く
                      setIsDropdownOpen(true);
                      // 続けて入力しやすいよう入力欄へフォーカスを戻す
                      symbolInputRef.current?.focus();
                    }}
                    title="入力内容をクリア"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-100 hover:bg-slate-700/70 transition text-[10px] leading-none"
                  >
                    ✕
                  </button>
                )}

                {/* サジェストドロップダウンリスト */}
                {isDropdownOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-64 max-h-56 overflow-y-auto bg-[#131B2E] border border-slate-700 rounded-lg shadow-2xl z-50 py-1 divide-y divide-slate-800/50">
                    {/* 候補項目のループレンダリング */}
                    {suggestions.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => executeSearch(item.symbol)}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-blue-600/30 transition group"
                      >
                        {/* 企業名・英語名表示部 */}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-blue-300 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-500">{item.nameEn}</span>
                        </div>
                        {/* 銘柄コード表示部 */}
                        <span className="text-xs font-mono font-bold text-emerald-400 ml-2">
                          {item.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 検索実行ボタン */}
              <button
                onClick={() => executeSearch(inputVal)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
              >
                検索
              </button>
            </>
          )}

          {/* 企業名表示バッジ（エラー時は赤色でエラーメッセージを表示） */}
          <div className="flex items-center ml-1">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded border truncate max-w-[140px] sm:max-w-[220px] ${
                loadError
                  ? 'text-red-400 bg-red-950/40 border-red-800/60'
                  : 'text-slate-200 bg-slate-800/80 border-slate-700/60'
              }`}
              title={loadError || undefined}
            >
              {loadError ? '⚠ 銘柄が見つかりません' : getDisplayCompanyName()}
            </span>
          </div>
        </div>
      </div>

      {/* チャート描画およびSVG/HTMLオーバーレイ領域 */}
      <div 
        className="flex-1 min-h-0 w-full relative overflow-hidden z-10 [&_a]:!hidden [&_a]:!pointer-events-none" 
        ref={chartContainerRef}
      >
        {/* オーバーレイ要素表示エリア */}
        <div
          className="absolute top-0 left-0 bottom-[28px] overflow-hidden pointer-events-none z-10"
          style={{ right: `${priceScaleWidth}px` }}
        >
          {/* シグナル垂直破線描画用SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* シグナルごとの点線描画 */}
            {renderedBadges.map((badge) => (
              <line
                key={`line-${badge.id}`}
                x1={badge.x}
                y1={0}
                x2={badge.x}
                y2="100%"
                stroke={badge.type === 'LONG_ENTRY' ? '#EAB308' : '#3B82F6'}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            ))}

            {/* 保有ポジションの取得日をピンク色の点線縦線として描画（未入力・表示範囲外の場合は非表示） */}
            {acquisitionLineX !== null && (
              <line
                x1={acquisitionLineX}
                y1={0}
                x2={acquisitionLineX}
                y2="100%"
                stroke="#EC4899"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* 取得日ラベル（縦線の位置がわかるよう上端に小さく表示） */}
          {acquisitionLineX !== null && (
            <div
              className="absolute pointer-events-none -translate-x-1/2 px-1.5 py-0.5 rounded shadow-lg bg-[#EC4899] text-white text-[10px] font-bold whitespace-nowrap"
              style={{ left: `${acquisitionLineX}px`, top: '8px' }}
            >
              取得日
            </div>
          )}

          {/* 取得単価ラベル（チャート左端に表示。右側の価格軸ラベルの代わりに独自表示する） */}
          {acquisitionPriceY !== null && acquisitionPrice != null && (
            <div
              className="absolute pointer-events-none -translate-y-1/2 px-1.5 py-0.5 rounded shadow-lg bg-[#EC4899] text-white text-[10px] font-bold whitespace-nowrap"
              style={{ left: '4px', top: `${acquisitionPriceY}px` }}
            >
              取得単価 {acquisitionPrice.toLocaleString()}
            </div>
          )}

          {/* シグナルバッジ（吹き出し）要素の描画 */}
          {renderedBadges.map((badge) => {
            // エントリー用バッジ（黄色）
            if (badge.type === 'LONG_ENTRY') {
              return (
                <div
                  key={`badge-${badge.id}`}
                  className="absolute pointer-events-none -translate-x-1/2 flex flex-col items-center justify-center px-2 py-0.5 rounded shadow-lg bg-[#EAB308] text-black border border-yellow-400 w-max whitespace-nowrap"
                  style={{ left: `${badge.x}px`, bottom: '4px' }}
                >
                  <span className="text-[10px] font-black leading-none tracking-tight whitespace-nowrap">Long Entry</span>
                  <span className="text-[11px] font-bold font-mono leading-tight whitespace-nowrap">{badge.priceStr}</span>
                </div>
              );
            }

            // 手仕舞い用バッジ（青色）
            return (
              <div
                key={`badge-${badge.id}`}
                className="absolute pointer-events-none -translate-x-1/2 flex flex-col items-center justify-center px-2 py-0.5 rounded shadow-lg bg-[#2563EB] text-white border border-blue-400 w-max whitespace-nowrap"
                style={{ left: `${badge.x}px`, top: '8px' }}
              >
                <span className="text-[10px] font-black leading-none tracking-tight whitespace-nowrap">Exit Long</span>
                <span className="text-[11px] font-bold font-mono leading-tight whitespace-nowrap">{badge.priceStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
