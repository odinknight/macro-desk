import { createServerFn } from "@tanstack/react-start";

export type Point = { t: number; v: number };
export type Group = "equity" | "fx" | "bond" | "commodity" | "fear" | "dollar";

export type Quote = {
  id: string;
  symbol: string;
  name: string;
  group: Group;
  price: number;
  prev: number;
  changePct: number;
  points: Point[];
  ret20: number | null;
  marketState: string | null;
};

export type MacroPoint = { year: string; value: number };
export type MacroCountry = {
  code: string;
  name: string;
  short: string;
  gdp: MacroPoint[];
  cpi: MacroPoint[];
  unemp: MacroPoint[];
};

export type Board = {
  asOf: number;
  asOfLabel: string;
  session: string | null;
  quotes: Quote[];
  failed: string[];
  macro: MacroCountry[];
  macroUpdated: string | null;
  corr: { ids: string[]; labels: string[]; matrix: (number | null)[][] };
};

type Spec = { id: string; symbol: string; name: string; group: Group };

const SYMBOLS: Spec[] = [
  { id: "spx", symbol: "^GSPC", name: "标普500", group: "equity" },
  { id: "dji", symbol: "^DJI", name: "道琼斯", group: "equity" },
  { id: "ndx", symbol: "^IXIC", name: "纳斯达克", group: "equity" },
  { id: "n225", symbol: "^N225", name: "日经225", group: "equity" },
  { id: "hsi", symbol: "^HSI", name: "恒生指数", group: "equity" },
  { id: "sse", symbol: "000001.SS", name: "上证综指", group: "equity" },
  { id: "star", symbol: "000688.SS", name: "科创50", group: "equity" },
  { id: "dax", symbol: "^GDAXI", name: "德国DAX", group: "equity" },
  { id: "ftse", symbol: "^FTSE", name: "富时100", group: "equity" },
  { id: "cac", symbol: "^FCHI", name: "法国CAC", group: "equity" },
  { id: "stoxx", symbol: "^STOXX50E", name: "欧洲斯托克50", group: "equity" },
  { id: "nifty", symbol: "^NSEI", name: "印度Nifty", group: "equity" },
  { id: "ks11", symbol: "^KS11", name: "韩国KOSPI", group: "equity" },
  { id: "axjo", symbol: "^AXJO", name: "澳洲标普200", group: "equity" },
  { id: "vix", symbol: "^VIX", name: "VIX", group: "fear" },
  { id: "vix3m", symbol: "^VIX3M", name: "VIX 3个月", group: "fear" },
  { id: "dxy", symbol: "DX-Y.NYB", name: "美元指数", group: "dollar" },
  { id: "eurusd", symbol: "EURUSD=X", name: "欧元/美元", group: "fx" },
  { id: "usdjpy", symbol: "USDJPY=X", name: "美元/日元", group: "fx" },
  { id: "gbpusd", symbol: "GBPUSD=X", name: "英镑/美元", group: "fx" },
  { id: "usdcny", symbol: "USDCNY=X", name: "美元/人民币", group: "fx" },
  { id: "usdhkd", symbol: "USDHKD=X", name: "美元/港币", group: "fx" },
  { id: "audusd", symbol: "AUDUSD=X", name: "澳元/美元", group: "fx" },
  { id: "usdcad", symbol: "USDCAD=X", name: "美元/加元", group: "fx" },
  { id: "usdchf", symbol: "USDCHF=X", name: "美元/瑞郎", group: "fx" },
  { id: "usdkrw", symbol: "USDKRW=X", name: "美元/韩元", group: "fx" },
  { id: "usdinr", symbol: "USDINR=X", name: "美元/卢比", group: "fx" },
  { id: "irx", symbol: "^IRX", name: "美国3个月", group: "bond" },
  { id: "y2", symbol: "2YY=F", name: "美国2年期货", group: "bond" },
  { id: "fvx", symbol: "^FVX", name: "美国5年", group: "bond" },
  { id: "tnx", symbol: "^TNX", name: "美国10年", group: "bond" },
  { id: "tyx", symbol: "^TYX", name: "美国30年", group: "bond" },
  { id: "gold", symbol: "GC=F", name: "黄金", group: "commodity" },
  { id: "oil", symbol: "CL=F", name: "WTI原油", group: "commodity" },
  { id: "copper", symbol: "HG=F", name: "铜", group: "commodity" },
];

const CORR_IDS = [
  "spx",
  "n225",
  "hsi",
  "sse",
  "star",
  "dax",
  "vix",
  "tnx",
  "y2",
  "dxy",
  "gold",
  "oil",
  "copper",
  "eurusd",
  "usdcny",
  "usdjpy",
  "usdhkd",
];

const COUNTRIES: { code: string; name: string; short: string }[] = [
  { code: "USA", name: "美国", short: "美" },
  { code: "CHN", name: "中国", short: "中" },
  { code: "JPN", name: "日本", short: "日" },
  { code: "DEU", name: "德国", short: "德" },
  { code: "GBR", name: "英国", short: "英" },
  { code: "FRA", name: "法国", short: "法" },
  { code: "IND", name: "印度", short: "印" },
  { code: "KOR", name: "韩国", short: "韩" },
  { code: "AUS", name: "澳大利亚", short: "澳" },
  { code: "CAN", name: "加拿大", short: "加" },
  { code: "BRA", name: "巴西", short: "巴" },
  { code: "ITA", name: "意大利", short: "意" },
  { code: "MEX", name: "墨西哥", short: "墨" },
  { code: "HKG", name: "中国香港", short: "港" },
];

const INDICATORS = {
  gdp: "NY.GDP.MKTP.KD.ZG",
  cpi: "FP.CPI.TOTL.ZG",
  unemp: "SL.UEM.TOTL.ZS",
} as const;

let cache: { at: number; board: Board } | null = null;
const TTL_MS = 45_000;

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function retBack(points: Point[], back: number): number | null {
  if (points.length <= back) return null;
  const last = points[points.length - 1]?.v;
  const base = points[points.length - 1 - back]?.v;
  if (!last || !base) return null;
  return last / base - 1;
}

async function fetchYahoo(spec: Spec): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(spec.symbol)}?interval=1d&range=6mo`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: {
        result?: {
          timestamp?: number[];
          indicators?: { quote?: { close?: (number | null)[] }[] };
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            marketState?: string;
          };
        }[];
      };
    };
    const row = json.chart?.result?.[0];
    if (!row) return null;
    const ts = row.timestamp ?? [];
    const closes = row.indicators?.quote?.[0]?.close ?? [];
    const points: Point[] = [];
    for (let i = 0; i < ts.length; i++) {
      const v = closes[i];
      if (v != null && Number.isFinite(v)) points.push({ t: ts[i] * 1000, v });
    }
    if (points.length < 2) return null;
    const meta = row.meta ?? {};
    const price = Number.isFinite(meta.regularMarketPrice) ? (meta.regularMarketPrice as number) : points[points.length - 1].v;
    const prevRaw = meta.chartPreviousClose ?? meta.previousClose ?? points[points.length - 2].v;
    const prev = Number.isFinite(prevRaw) ? prevRaw : points[points.length - 2].v;
    const changePct = prev ? price / prev - 1 : 0;
    return {
      id: spec.id,
      symbol: spec.symbol,
      name: spec.name,
      group: spec.group,
      price,
      prev,
      changePct,
      points,
      ret20: retBack(points, 20),
      marketState: meta.marketState ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type SeriesMap = Map<string, MacroPoint[]>;

async function fetchIndicator(indicator: string): Promise<{ updated: string | null; map: SeriesMap }> {
  const iso = COUNTRIES.map((c) => c.code).join(";");
  const url = `https://api.worldbank.org/v2/country/${iso}/indicator/${indicator}?format=json&per_page=800&date=2016:2026`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  const map: SeriesMap = new Map();
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return { updated: null, map };
    const json = (await res.json()) as [
      { lastupdated?: string } | null,
      { countryiso3code?: string; date?: string; value?: number | null }[] | null,
    ];
    const updated = json?.[0]?.lastupdated ?? null;
    const rows = Array.isArray(json?.[1]) ? json[1] : [];
    for (const row of rows) {
      if (!row.countryiso3code || !row.date || row.value == null || !Number.isFinite(row.value)) continue;
      const list = map.get(row.countryiso3code) ?? [];
      list.push({ year: row.date, value: row.value });
      map.set(row.countryiso3code, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.year.localeCompare(b.year));
    return { updated, map };
  } catch {
    return { updated: null, map };
  } finally {
    clearTimeout(timer);
  }
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 20) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  const rho = num / Math.sqrt(dx * dy);
  return Number.isFinite(rho) ? rho : null;
}

function dailyReturns(points: Point[]): { day: string; r: number }[] {
  const out: { day: string; r: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].v;
    const b = points[i].v;
    if (!a || !b) continue;
    out.push({ day: new Date(points[i].t).toISOString().slice(0, 10), r: b / a - 1 });
  }
  return out;
}

function correlation(quotes: Quote[]): Board["corr"] {
  const ids = CORR_IDS.filter((id) => quotes.some((q) => q.id === id));
  const labels = ids.map((id) => quotes.find((q) => q.id === id)?.name ?? id);
  const returns = ids.map((id) => dailyReturns(quotes.find((q) => q.id === id)?.points ?? []));
  const matrix: (number | null)[][] = ids.map(() => ids.map(() => null));
  for (let i = 0; i < ids.length; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < ids.length; j++) {
      const b = new Map(returns[j].map((p) => [p.day, p.r]));
      const xs: number[] = [];
      const ys: number[] = [];
      for (const p of returns[i]) {
        const y = b.get(p.day);
        if (y == null || !Number.isFinite(p.r) || !Number.isFinite(y)) continue;
        xs.push(p.r);
        ys.push(y);
      }
      const slicedX = xs.slice(-60);
      const slicedY = ys.slice(-60);
      const rho = pearson(slicedX, slicedY);
      matrix[i][j] = rho;
      matrix[j][i] = rho;
    }
  }
  return { ids, labels, matrix };
}

async function loadBoard(): Promise<Board> {
  const [quoteRows, gdpRes, cpiRes, unempRes] = await Promise.all([
    pool(SYMBOLS, 8, fetchYahoo),
    fetchIndicator(INDICATORS.gdp),
    fetchIndicator(INDICATORS.cpi),
    fetchIndicator(INDICATORS.unemp),
  ]);
  const quotes = quoteRows.filter((q): q is Quote => q != null);
  const failed = SYMBOLS.filter((s) => !quotes.some((q) => q.id === s.id)).map((s) => s.name);
  if (quotes.length < 8) {
    throw new Error("行情源暂时不可用，请稍后再刷新。");
  }
  const macro: MacroCountry[] = COUNTRIES.map((c) => ({
    code: c.code,
    name: c.name,
    short: c.short,
    gdp: gdpRes.map.get(c.code) ?? [],
    cpi: cpiRes.map.get(c.code) ?? [],
    unemp: unempRes.map.get(c.code) ?? [],
  })).filter((c) => c.gdp.length || c.cpi.length || c.unemp.length);
  const session = quotes.find((q) => q.id === "spx")?.marketState ?? null;
  return {
    asOf: Date.now(),
    asOfLabel: new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Hong_Kong",
      hour12: false,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    session,
    quotes,
    failed,
    macro,
    macroUpdated: gdpRes.updated ?? cpiRes.updated ?? unempRes.updated,
    corr: correlation(quotes),
  };
}

export const getBoard = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    if (input && typeof input === "object" && "fresh" in input && (input as { fresh?: unknown }).fresh === true) {
      return { fresh: true };
    }
    return { fresh: false };
  })
  .handler(async ({ data }): Promise<Board> => {
    if (!data.fresh && cache && Date.now() - cache.at < TTL_MS) return cache.board;
    const board = await loadBoard();
    cache = { at: Date.now(), board };
    return board;
  });
