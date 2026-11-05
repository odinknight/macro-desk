import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { LogicMap } from "@/components/logic-map";
import {
  EDGES,
  NODES,
  QUOTE_FOR_NODE,
  READ_STEPS,
  buildNarrative,
  consistency,
  type NodeId,
  type Sign,
} from "@/lib/economics";
import { getBoard, type Board, type MacroPoint, type Point, type Quote } from "@/lib/market.functions";

const SESSION: Record<string, string> = {
  REGULAR: "美股交易中",
  CLOSED: "美股已收盘",
  PRE: "美股盘前",
  POST: "美股盘后",
  PREPRE: "美股盘前",
  POSTPOST: "美股盘后",
};

const FX_NOTE: Record<string, string> = {
  eurusd: "上升 = 欧元更强、美元更弱",
  gbpusd: "上升 = 英镑更强",
  audusd: "上升 = 澳元更强",
  usdjpy: "上升 = 日元更弱",
  usdcny: "上升 = 人民币更弱",
  usdhkd: "联系汇率，正常时贴近 7.80",
  usdcad: "上升 = 加元更弱",
  usdchf: "上升 = 瑞郎更弱",
  usdkrw: "上升 = 韩元更弱",
  usdinr: "上升 = 卢比更弱",
  dxy: "上升 = 美元对一篮子货币更强",
};

const LINE_COLORS = [
  "var(--color-accent)",
  "var(--color-fg)",
  "var(--color-up)",
  "var(--color-down)",
  "var(--color-muted)",
  "color-mix(in srgb, var(--color-accent) 50%, var(--color-fg))",
  "color-mix(in srgb, var(--color-up) 55%, var(--color-fg))",
  "color-mix(in srgb, var(--color-down) 45%, var(--color-fg))",
];

const KPI_IDS = ["spx", "hsi", "sse", "vix", "dxy", "tnx", "usdcny", "gold"];

function quote(board: Board, id: string): Quote | null {
  return board.quotes.find((item) => item.id === id) ?? null;
}

function latest(series: MacroPoint[]): MacroPoint | null {
  return series.length ? series[series.length - 1] : null;
}

function quarterEnd(date: string): string {
  const match = /^(\d{4})-Q([1-4])$/.exec(date);
  if (!match) return date;
  return `${match[1]}-${["03", "06", "09", "12"][Number(match[2]) - 1]}`;
}

function MacroCell({ point }: { point: MacroPoint | null }) {
  if (!point) return <td className="num px-3 py-2 text-muted">—</td>;
  return (
    <td className="num px-3 py-2">
      <div>{point.value.toFixed(1)}%</div>
      <div className="text-xs text-muted">{point.date}</div>
    </td>
  );
}

function fmtNum(n: number, digits: number): string {
  const [whole, frac] = n.toFixed(digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

function fmtPct(fraction: number, digits = 2): string {
  const value = fraction * 100;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function fmtPrice(q: Quote): string {
  if (q.group === "bond") return `${fmtNum(q.price, 2)}%`;
  if (q.group === "fear") return fmtNum(q.price, 2);
  if (q.group === "fx") return q.price >= 20 ? fmtNum(q.price, 2) : fmtNum(q.price, 4);
  return fmtNum(q.price, q.price >= 1000 ? 2 : 2);
}

function priceTone(q: Quote): string {
  const stress = q.id === "vix" || q.id === "vix3m";
  if (q.changePct > 0.0000001) return stress ? "text-down" : "text-up";
  if (q.changePct < -0.0000001) return stress ? "text-up" : "text-down";
  return "text-muted";
}

function nodeValues(board: Board): Partial<Record<NodeId, string>> {
  const us = board.macro.find((c) => c.code === "USA");
  const cpi = us ? latest(us.cpi) : null;
  const gdp = us ? latest(us.gdp) : null;
  const unemp = us ? latest(us.unemp) : null;
  const tnx = quote(board, "tnx");
  const values: Partial<Record<NodeId, string>> = {};
  const oil = quote(board, "oil");
  const copper = quote(board, "copper");
  const irx = quote(board, "irx");
  const dxy = quote(board, "dxy");
  const gold = quote(board, "gold");
  const spx = quote(board, "spx");
  const vix = quote(board, "vix");
  const cny = quote(board, "usdcny");
  if (oil) values.oil = fmtNum(oil.price, 2);
  if (copper) values.copper = fmtNum(copper.price, 2);
  if (cpi) values.cpi = `${cpi.value.toFixed(1)}%`;
  if (gdp) values.gdp = `${gdp.value.toFixed(1)}%`;
  if (unemp) values.unemp = `${unemp.value.toFixed(1)}%`;
  if (irx) values.policy = `${irx.price.toFixed(2)}%`;
  if (tnx) values.y10 = `${tnx.price.toFixed(2)}%`;
  if (tnx && cpi) values.real = `${(tnx.price - cpi.value).toFixed(2)}%`;
  if (dxy) values.dxy = fmtNum(dxy.price, 2);
  if (gold) values.gold = fmtNum(gold.price, 0);
  if (spx) values.equity = fmtNum(spx.price, 0);
  if (vix) values.vix = vix.price.toFixed(1);
  if (cny) values.fx = fmtNum(cny.price, 2);
  return values;
}

function rhoOf(board: Board, a: string, b: string): number | null {
  const i = board.corr.ids.indexOf(a);
  const j = board.corr.ids.indexOf(b);
  if (i < 0 || j < 0) return null;
  return board.corr.matrix[i]?.[j] ?? null;
}

function Spark({ points, tone }: { points: Point[]; tone: string }) {
  const slice = points.slice(-36);
  if (slice.length < 2) return null;
  const w = 128;
  const h = 36;
  const xs = slice.map((p) => p.v);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min || 1;
  const d = slice
    .map((p, i) => {
      const x = (i / (slice.length - 1)) * w;
      const y = h - ((p.v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = tone === "text-up" ? "var(--color-up)" : tone === "text-down" ? "var(--color-down)" : "var(--color-muted)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-9 w-full" aria-hidden="true">
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" />
    </svg>
  );
}

function signClass(sign: Sign): string {
  if (sign === "+") return "text-up";
  if (sign === "-") return "text-down";
  return "text-muted";
}

const tooltipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-fg)",
  fontSize: 12,
};

function NormChart({
  board,
  ids,
  days,
}: {
  board: Board;
  ids: string[];
  days: number;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = ids.filter((id) => !hidden.includes(id) && quote(board, id));
  const data = useMemo(() => {
    const rows = new Map<string, Record<string, number | string>>();
    for (const id of visible) {
      const series = quote(board, id)?.points.slice(-days) ?? [];
      const base = series[0]?.v;
      if (!base) continue;
      for (const point of series) {
        const key = new Date(point.t).toISOString().slice(5, 10);
        const row = rows.get(key) ?? { t: key };
        row[id] = Number((((point.v / base - 1) * 100).toFixed(2)));
        rows.set(key, row);
      }
    }
    return [...rows.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, row]) => row);
  }, [board, days, visible]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ids.map((id, index) => {
          const q = quote(board, id);
          if (!q) return null;
          const off = hidden.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden((curr) => (curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]))}
              className={`min-h-11 rounded-full px-3 text-sm ${off ? "text-muted" : "text-fg"}`}
              style={{ boxShadow: off ? "inset 0 0 0 1px var(--color-border)" : `inset 0 0 0 1.5px ${LINE_COLORS[index % LINE_COLORS.length]}` }}
            >
              {q.name}
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted">至少保留一条曲线。</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{ fill: "var(--color-muted)", fontSize: 11 }} minTickGap={24} />
              <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} unit="%" width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, "累计"]}
              />
              {visible.map((id) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={quote(board, id)?.name ?? id}
                  stroke={LINE_COLORS[ids.indexOf(id) % LINE_COLORS.length]}
                  dot={false}
                  strokeWidth={1.8}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function WindowToggle({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  const options = [
    { days: 22, label: "近1月" },
    { days: 66, label: "近3月" },
    { days: 140, label: "近6月" },
  ];
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.days}
          type="button"
          aria-pressed={value === option.days}
          onClick={() => onChange(option.days)}
          className={`min-h-11 rounded-full px-3 text-sm ${value === option.days ? "bg-accent text-bg" : "text-muted"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Section({
  id,
  kicker,
  title,
  intro,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-xs tracking-widest text-accent">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">{intro}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MarketBoard({ initial }: { initial: Board }) {
  const [board, setBoard] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NodeId>("y10");
  const [showAllEdges, setShowAllEdges] = useState(true);
  const [equityDays, setEquityDays] = useState(140);
  const [fxDays, setFxDays] = useState(66);
  const [macroCode, setMacroCode] = useState("USA");

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const next = await getBoard({ data: { fresh: true } });
        if (!stop) {
          setBoard(next);
          setError(null);
        }
      } catch {
        if (!stop) setError("这一轮刷新没有取到新数据，下面仍是上一笔。");
      }
    };
    const id = setInterval(tick, 60_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  async function reload() {
    setPending(true);
    try {
      const next = await getBoard({ data: { fresh: true } });
      setBoard(next);
      setError(null);
    } catch {
      setError("刷新失败，仍显示上一笔数据。");
    } finally {
      setPending(false);
    }
  }

  const us = board.macro.find((c) => c.code === "USA") ?? null;
  const usCpi = us ? latest(us.cpi) : null;
  const usGdp = us ? latest(us.gdp) : null;
  const usUnemp = us ? latest(us.unemp) : null;
  const narrative = buildNarrative({
    vix: quote(board, "vix")?.price ?? null,
    vix3m: quote(board, "vix3m")?.price ?? null,
    tnx: quote(board, "tnx")?.price ?? null,
    irx: quote(board, "irx")?.price ?? null,
    y2: quote(board, "y2")?.price ?? null,
    spxRet20: quote(board, "spx")?.ret20 ?? null,
    dxyRet20: quote(board, "dxy")?.ret20 ?? null,
    cpi: usCpi?.value ?? null,
    gdp: usGdp?.value ?? null,
    cpiAsOf: usCpi?.date ?? null,
    gdpAsOf: usGdp?.date ?? null,
  });
  const values = nodeValues(board);
  const node = NODES.find((item) => item.id === selected) ?? NODES[0];
  const edges = showAllEdges ? EDGES : EDGES.filter((edge) => edge.from === selected || edge.to === selected);
  const curve = ["irx", "y2", "fvx", "tnx", "tyx"]
    .map((id) => {
      const q = quote(board, id);
      return q ? { name: q.name, y: Number(q.price.toFixed(3)) } : null;
    })
    .filter((row): row is { name: string; y: number } => row != null);
  const bondHistory = useMemo(() => buildLevelSeries(board, ["irx", "y2", "fvx", "tnx", "tyx"], 140), [board]);
  const fearHistory = useMemo(() => buildLevelSeries(board, ["vix", "vix3m"], 140), [board]);
  const macroCountry = board.macro.find((c) => c.code === macroCode) ?? board.macro[0];
  const macroChart = useMemo(() => {
    if (!macroCountry) return [];
    const byKey = new Map<string, { label: string; gdp: number | null; cpi: number | null; unemp: number | null }>();
    const touch = (date: string) => {
      const label = quarterEnd(date);
      if (!byKey.has(label)) byKey.set(label, { label, gdp: null, cpi: null, unemp: null });
      return byKey.get(label)!;
    };
    for (const point of macroCountry.cpi) touch(point.date).cpi = point.value;
    for (const point of macroCountry.unemp) touch(point.date).unemp = point.value;
    for (const point of macroCountry.gdp) touch(point.date).gdp = point.value;
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-36);
  }, [macroCountry]);
  const scatter = board.macro
    .map((c) => {
      const g = latest(c.gdp);
      const p = latest(c.cpi);
      if (!g || !p) return null;
      return { name: c.short, full: c.name, gdp: g.value, cpi: p.value, gdpAsOf: g.date, cpiAsOf: p.date };
    })
    .filter(
      (row): row is { name: string; full: string; gdp: number; cpi: number; gdpAsOf: string; cpiAsOf: string } =>
        row != null,
    );
  const tnx = quote(board, "tnx");
  const irx = quote(board, "irx");
  const y2 = quote(board, "y2");
  const vix = quote(board, "vix");
  const vix3m = quote(board, "vix3m");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="text-xs tracking-widest text-accent">MACRO DESK</p>
            <h1 className="font-display text-xl">宏观传导台</h1>
          </div>
          <nav className="flex flex-wrap gap-1 text-sm">
            {[
              ["logic", "传导"],
              ["equity", "股市"],
              ["fx", "汇率"],
              ["bonds", "债市"],
              ["macro", "实体"],
              ["corr", "相关"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center px-2 text-muted">
                {label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={reload}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm text-bg disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-sm text-muted">
            行情约每 60 秒更新一次，取的是最新报价和近 6 个月日线，不是逐笔。实体经济按观察期标注：GDP 为季度同比，CPI 和失业率为月度，各国最新月份不必相同。
            {board.session ? ` ${SESSION[board.session] ?? board.session}。` : ""} 香港时间 {board.asOfLabel}。
          </p>
          <p className="text-xs text-muted">涨绿跌红。VIX 上升标红，因为那是压力变大，不是价格变好。</p>
        </div>
        {error ? <p className="text-sm text-down">{error}</p> : null}
        {board.failed.length ? (
          <p className="text-xs text-muted">这轮没有取到：{board.failed.join("、")}。其余数据照常使用。</p>
        ) : null}

        <div className="panel p-5">
          <p className="text-xs tracking-widest text-accent">此刻市场在定价什么</p>
          <h2 className="mt-1 font-display text-2xl">{narrative.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg">{narrative.body}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {KPI_IDS.map((id) => {
            const q = quote(board, id);
            if (!q) return null;
            const tone = priceTone(q);
            return (
              <article key={id} className="panel p-4">
                <p className="text-sm text-muted">{q.name}</p>
                <p className={`num mt-1 text-2xl ${tone}`}>{fmtPrice(q)}</p>
                <p className={`num text-sm ${tone}`}>
                  {fmtPct(q.changePct)}
                  <span className="text-muted"> 今日</span>
                </p>
                <Spark points={q.points} tone={tone} />
              </article>
            );
          })}
        </div>

        <Section
          id="logic"
          kicker="经济学传导"
          title="先看谁推动谁"
          intro="绿线是机制上的同向，红线是反向，灰线是条件式的。点一个节点，图上只展开它的传导，右边写清定义。下面的列表把每一条关系写成一句话。"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {READ_STEPS.map((step) => (
              <article key={step.n} className="panel p-4">
                <p className="num text-xs text-accent">{step.n}</p>
                <h3 className="mt-1 font-display text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
            <div className="panel min-w-0 p-3 lg:col-span-2">
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <LogicMap selected={selected} onSelect={setSelected} values={values} />
                </div>
              </div>
              <p className="px-2 pb-2 text-xs text-muted">节点上的宏观数字是美国最新公布值，观察期见实体经济表。短端是 3 个月国库券，不是联邦基金目标。</p>
            </div>
            <aside className="panel p-5 lg:sticky lg:top-20">
              <p className="text-xs tracking-widest text-accent">当前节点</p>
              <h3 className="mt-1 font-display text-2xl">{node.name}</h3>
              <p className="num mt-2 text-3xl text-accent">{values[node.id] ?? "—"}</p>
              <p className="mt-3 text-sm">{node.blurb}</p>
              <p className="mt-2 text-sm text-muted">{node.mechanism}</p>
              {node.id === "real" && tnx && usCpi ? (
                <p className="num mt-3 text-sm text-fg">
                  {tnx.price.toFixed(2)} − {usCpi.value.toFixed(2)} = {(tnx.price - usCpi.value).toFixed(2)}
                </p>
              ) : null}
              <ul className="mt-4 flex flex-col gap-3">
                {EDGES.filter((edge) => edge.from === node.id || edge.to === node.id).map((edge) => {
                  const otherId = edge.from === node.id ? edge.to : edge.from;
                  const other = NODES.find((item) => item.id === otherId);
                  const leftQ = QUOTE_FOR_NODE[edge.from];
                  const rightQ = QUOTE_FOR_NODE[edge.to];
                  const rho = leftQ && rightQ ? rhoOf(board, leftQ, rightQ) : null;
                  return (
                    <li key={edge.id}>
                      <button type="button" onClick={() => setSelected(otherId)} className="min-h-11 text-left text-sm">
                        <span className={signClass(edge.sign)}>
                          {edge.sign} {edge.tag}
                        </span>
                        <span className="text-muted"> → {other?.name}</span>
                      </button>
                      {leftQ && rightQ ? (
                        <p className="text-xs text-muted">
                          60 日相关 {rho == null ? "—" : rho.toFixed(2)}。{consistency(edge.sign, rho)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">{consistency(edge.sign, null)}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg">每一条关系</h3>
            <button
              type="button"
              onClick={() => setShowAllEdges((v) => !v)}
              className="min-h-11 rounded-full px-3 text-sm text-accent"
            >
              {showAllEdges ? "只看当前节点" : "显示全部传导"}
            </button>
          </div>
          <ul className="mt-2">
            {edges.map((edge) => {
              const from = NODES.find((item) => item.id === edge.from);
              const to = NODES.find((item) => item.id === edge.to);
              const hot = edge.from === selected || edge.to === selected;
              return (
                <li key={edge.id} className={`border-b border-border py-3 ${hot ? "bg-fg/5" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setSelected(edge.from)} className="min-h-11 px-1 text-sm">
                      {from?.name}
                    </button>
                    <span className={`text-sm ${signClass(edge.sign)}`}>
                      {edge.sign} {edge.tag}
                    </span>
                    <button type="button" onClick={() => setSelected(edge.to)} className="min-h-11 px-1 text-sm">
                      {to?.name}
                    </button>
                  </div>
                  <p className="text-sm text-muted">{edge.note}</p>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          id="equity"
          kicker="股市"
          title="主要指数，起点对齐"
          intro="每条线都换成相对窗口第一天的累计涨跌，所以指数点位不同也能放在一起比。点图例可以关掉单条线。"
        >
          <div className="panel p-4">
            <div className="mb-3 flex justify-end">
              <WindowToggle value={equityDays} onChange={setEquityDays} />
            </div>
            <NormChart
              board={board}
              days={equityDays}
              ids={["spx", "ndx", "dji", "hsi", "sse", "star", "n225", "dax", "ftse", "cac", "stoxx", "nifty", "ks11", "axjo"]}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {board.quotes
              .filter((q) => q.group === "equity")
              .map((q) => (
                <article key={q.id} className="panel flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm">{q.name}</p>
                    <p className="num text-lg">{fmtPrice(q)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`num text-sm ${priceTone(q)}`}>{fmtPct(q.changePct)}</p>
                    <p className="num text-xs text-muted">20日 {q.ret20 == null ? "—" : fmtPct(q.ret20)}</p>
                  </div>
                </article>
              ))}
          </div>
          <div className="panel mt-3 p-4">
            <h3 className="font-display text-lg">恐慌指数与期限结构</h3>
            <p className="mt-1 text-sm text-muted">
              VIX 是未来 30 天的隐含波动率。
              {vix && vix3m
                ? ` 近月减 3 个月 = ${(vix.price - vix3m.price).toFixed(2)}。大于 0 是倒挂，近端保护比远期更贵。`
                : ""}
            </p>
            <div className="mt-3 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fearHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fill: "var(--color-muted)", fontSize: 11 }} minTickGap={28} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} width={40} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="vix" name="VIX" stroke="var(--color-down)" fill="color-mix(in srgb, var(--color-down) 25%, transparent)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="vix3m" name="VIX 3个月" stroke="var(--color-accent)" fill="transparent" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        <Section
          id="fx"
          kicker="汇率"
          title="美元在变强还是变弱"
          intro="不同货币对的报价方向不一样。欧元、英镑、澳元是“外币/美元”，数值上升表示美元更弱；美元/日元、美元/人民币则相反。图上统一画成相对起点的涨跌，避免被日元的大数字压扁。"
        >
          <div className="panel p-4">
            <div className="mb-3 flex justify-end">
              <WindowToggle value={fxDays} onChange={setFxDays} />
            </div>
            <NormChart
              board={board}
              days={fxDays}
              ids={["dxy", "eurusd", "usdjpy", "gbpusd", "usdcny", "usdhkd", "audusd", "usdcad", "usdchf", "usdkrw", "usdinr"]}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {board.quotes
              .filter((q) => q.group === "fx" || q.group === "dollar")
              .map((q) => (
                <article key={q.id} className="panel p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">{q.name}</p>
                    <p className={`num text-sm ${priceTone(q)}`}>{fmtPct(q.changePct)}</p>
                  </div>
                  <p className="num text-xl">{fmtPrice(q)}</p>
                  <p className="mt-1 text-xs text-muted">{FX_NOTE[q.id]}</p>
                </article>
              ))}
          </div>
        </Section>

        <Section
          id="bonds"
          kicker="债市"
          title="收益率曲线，不是债券价格"
          intro="下面的数字是收益率。收益率上升，债券价格下降。3 个月是国库券，2 年是收益率期货，5 年、10 年、30 年是国债收益率。10 年减 3 个月用来看曲线斜不斜，它不是教科书里的 10 年减 2 年现券利差。"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="panel p-4">
              <h3 className="font-display text-lg">当前曲线</h3>
              <div className="mt-3 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} unit="%" width={48} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(2)}%`, "收益率"]} />
                    <Line type="monotone" dataKey="y" name="收益率" stroke="var(--color-accent)" strokeWidth={2} dot isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="num mt-2 text-sm text-muted">
                {tnx && irx ? `10年−3个月 ${(tnx.price - irx.price) >= 0 ? "+" : ""}${((tnx.price - irx.price) * 100).toFixed(0)} bp。` : ""}
                {tnx && y2 ? ` 10年−2年期货 ${tnx.price - y2.price >= 0 ? "+" : ""}${((tnx.price - y2.price) * 100).toFixed(0)} bp。` : ""}
                {tnx && usCpi ? ` 近似实际利率 ${(tnx.price - usCpi.value).toFixed(2)}%。` : ""}
              </p>
            </div>
            <div className="panel p-4">
              <h3 className="font-display text-lg">近 6 个月收益率</h3>
              <div className="mt-3 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bondHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fill: "var(--color-muted)", fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} unit="%" width={48} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {["irx", "y2", "fvx", "tnx", "tyx"].map((id, index) => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        name={quote(board, id)?.name ?? id}
                        stroke={LINE_COLORS[index % LINE_COLORS.length]}
                        dot={false}
                        strokeWidth={1.6}
                        isAnimationActive={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="commodities"
          kicker="商品"
          title="油、铜、黄金各管一件事"
          intro="油价进通胀，铜价进增长，黄金进实际利率和美元。三条线同样换成相对起点的涨跌。"
        >
          <div className="panel p-4">
            <NormChart board={board} days={140} ids={["gold", "oil", "copper"]} />
          </div>
        </Section>

        <Section
          id="macro"
          kicker="实体经济"
          title="增长、通胀、失业"
          intro="GDP 是实际同比，按季，由不变价 GDP 相对上年同季算出。CPI 是月度同比。失业率是月度、季调。每个数字下面是该序列自己的观察期，不是抓取日期。没有月度序列的格子留空。点一个国家，看它 2024 年以来的三条线。散点用各国最新的 GDP 和 CPI，日期可以不同。"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="panel overflow-x-auto p-2">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">经济体</th>
                    <th className="px-3 py-2 font-medium">GDP 同比</th>
                    <th className="px-3 py-2 font-medium">CPI 同比</th>
                    <th className="px-3 py-2 font-medium">失业率</th>
                  </tr>
                </thead>
                <tbody>
                  {board.macro.map((c) => {
                    const g = latest(c.gdp);
                    const p = latest(c.cpi);
                    const u = latest(c.unemp);
                    const on = macroCountry?.code === c.code;
                    return (
                      <tr key={c.code} className={on ? "bg-fg/5" : ""}>
                        <td className="px-1 py-1">
                          <button type="button" onClick={() => setMacroCode(c.code)} className="min-h-11 px-2 text-left">
                            {c.name}
                          </button>
                        </td>
                        <MacroCell point={g} />
                        <MacroCell point={p} />
                        <MacroCell point={u} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="panel p-4">
              <h3 className="font-display text-lg">{macroCountry?.name ?? "宏观"} · 2024 年以来</h3>
              <div className="mt-3 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={macroChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} minTickGap={28} />
                    <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="gdp" name="GDP同比" stroke="var(--color-accent)" dot={false} isAnimationActive={false} connectNulls />
                    <Line type="monotone" dataKey="cpi" name="CPI同比" stroke="var(--color-down)" dot={false} isAnimationActive={false} connectNulls />
                    <Line type="monotone" dataKey="unemp" name="失业率" stroke="var(--color-fg)" dot={false} isAnimationActive={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="panel mt-3 p-4">
            <h3 className="font-display text-lg">增长—通胀位置</h3>
            <p className="mt-1 text-sm text-muted">横轴是最新季度的实际 GDP 同比，纵轴是最新月度 CPI 同比。右上更接近过热，左上是滞胀的方向，左下是需求不足。两条的观察期可以不一样。</p>
            <div className="mt-3 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="var(--color-border)" />
                  <XAxis dataKey="gdp" name="GDP" unit="%" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                  <YAxis dataKey="cpi" name="CPI" unit="%" tick={{ fill: "var(--color-muted)", fontSize: 11 }} width={48} />
                  <ZAxis range={[80, 80]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name === "gdp" ? "GDP" : "CPI"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { full?: string; gdpAsOf?: string; cpiAsOf?: string }
                        | undefined;
                      return row ? `${row.full} · GDP ${row.gdpAsOf} · CPI ${row.cpiAsOf}` : "";
                    }}
                  />
                  <Scatter data={scatter} fill="var(--color-accent)" isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted">
              {scatter.map((row) => `${row.name}${row.gdp.toFixed(1)}(${row.gdpAsOf})/${row.cpi.toFixed(1)}(${row.cpiAsOf})`).join("  ·  ")}
            </p>
          </div>
          {usUnemp ? <p className="mt-2 text-xs text-muted">美国失业率最新公布 {usUnemp.value.toFixed(2)}%（{usUnemp.date}）。</p> : null}
        </Section>

        <Section
          id="corr"
          kicker="实证相关"
          title="近 60 个共同交易日"
          intro="格子里是日收益率的相关系数，按 UTC 日期对齐，跨市场假日会减少样本。至少 20 个重叠日才显示。1 是自己和自己。这张表回答“最近有没有一起动”，上面的传导图回答“教科书认为谁应该推动谁”。两者不一致时，以表里的数字为准描述近期，以图里的机制为准描述结构。"
        >
          <div className="panel overflow-x-auto p-2">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-center text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface p-2 text-left font-medium text-muted"> </th>
                  {board.corr.labels.map((label) => (
                    <th key={label} className="p-2 font-medium text-muted">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.corr.ids.map((id, i) => (
                  <tr key={id}>
                    <th className="sticky left-0 bg-surface p-2 text-left font-medium">{board.corr.labels[i]}</th>
                    {board.corr.matrix[i].map((rho, j) => {
                      const bg =
                        rho == null || i === j
                          ? "transparent"
                          : `color-mix(in srgb, ${rho >= 0 ? "var(--color-up)" : "var(--color-down)"} ${Math.round(Math.abs(rho) * 48)}%, var(--color-surface))`;
                      return (
                        <td key={`${id}-${board.corr.ids[j]}`} className="num p-2" style={{ background: bg }}>
                          {i === j ? "1" : rho == null ? "—" : rho.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <CorrLine board={board} a="spx" b="vix" text="股市对恐慌：急跌时保护变贵，相关通常为负。" />
            <CorrLine board={board} a="spx" b="tnx" text="股市对十年期：贴现率渠道为负，但增长同时推高利率和盈利，所以符号会翻。" />
            <CorrLine board={board} a="dxy" b="gold" text="美元对黄金：计价渠道为负。" />
            <CorrLine board={board} a="oil" b="tnx" text="油价对十年期：成本推升通胀预期时为正，衰退式需求崩塌时可以为负。" />
            <CorrLine board={board} a="dxy" b="usdcny" text="美元指数对美元/人民币：美元强时人民币报价通常上升。" />
          </ul>
        </Section>

        <footer className="border-t border-border pt-4 text-xs leading-relaxed text-muted">
          行情来自 Yahoo Finance 的最新报价与日线，可能有延迟。2 年期使用收益率期货 2YY=F。实体经济来自世界银行全球经济监测，不是年度库：CPI 为季调名义同比（月），失业率为季调（月），实际 GDP 同比由不变价季调 GDP 相对上年同季计算（季）。美国 CPI 和失业率若能取到劳工统计局更近的月份，就改用那一条（未季调 CPI-U 同比、季调失业率）。中国、印度没有这条月度失业率，澳大利亚没有这条月度 CPI。观察期标在每个数字下面。相关不是因果。本页不构成投资建议。
        </footer>
      </main>
    </div>
  );
}

function CorrLine({ board, a, b, text }: { board: Board; a: string; b: string; text: string }) {
  const rho = rhoOf(board, a, b);
  const left = quote(board, a)?.name ?? a;
  const right = quote(board, b)?.name ?? b;
  return (
    <li>
      <span className="num text-fg">{left} / {right} {rho == null ? "—" : rho.toFixed(2)}</span>
      。{text}
    </li>
  );
}

function buildLevelSeries(board: Board, ids: string[], days: number) {
  const rows = new Map<string, Record<string, number | string>>();
  for (const id of ids) {
    const series = quote(board, id)?.points.slice(-days) ?? [];
    for (const point of series) {
      const key = new Date(point.t).toISOString().slice(5, 10);
      const row = rows.get(key) ?? { t: key };
      row[id] = Number(point.v.toFixed(3));
      rows.set(key, row);
    }
  }
  return [...rows.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, row]) => row);
}
