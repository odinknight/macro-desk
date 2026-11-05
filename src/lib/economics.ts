export type Sign = "+" | "-" | "±";

export type NodeId =
  | "oil"
  | "copper"
  | "cpi"
  | "gdp"
  | "unemp"
  | "policy"
  | "y10"
  | "real"
  | "dxy"
  | "gold"
  | "equity"
  | "vix"
  | "fx";

export type LogicNode = {
  id: NodeId;
  name: string;
  x: number;
  y: number;
  blurb: string;
  mechanism: string;
};

export type LogicEdge = {
  id: string;
  from: NodeId;
  to: NodeId;
  sign: Sign;
  tag: string;
  note: string;
};

export const QUOTE_FOR_NODE: Partial<Record<NodeId, string>> = {
  oil: "oil",
  copper: "copper",
  policy: "irx",
  y10: "tnx",
  dxy: "dxy",
  gold: "gold",
  equity: "spx",
  vix: "vix",
  fx: "usdcny",
};

export const READ_STEPS = [
  {
    n: "01",
    title: "冲击先进入实体",
    text: "油价走的是成本，铜价照的是工业需求，失业确认需求有没有转弱。它们先改通胀和产出，而不是直接改股价。",
  },
  {
    n: "02",
    title: "实体再进入利率",
    text: "泰勒规则：通胀和过热把短端推高，失业则打开宽松。十年期站在短端这个锚上，再加上增长、通胀预期和期限溢价。",
  },
  {
    n: "03",
    title: "利率才进入资产",
    text: "十年期是股市的贴现率。实际利率和美元决定黄金与汇率。恐慌指数是风险溢价的价格，它和股市会互相放大。",
  },
] as const;

export const NODES: LogicNode[] = [
  {
    id: "oil",
    name: "油价",
    x: 110,
    y: 78,
    blurb: "能源成本，也是一种供给冲击。",
    mechanism:
      "这里用 WTI 原油期货。油价上涨如果来自供给收缩，会推高通胀、压低实际收入，更接近滞胀；如果来自需求旺盛，则和增长同向。",
  },
  {
    id: "cpi",
    name: "通胀",
    x: 340,
    y: 78,
    blurb: "物价增速，名义利率里的水分。",
    mechanism:
      "节点上的数字是美国 CPI 同比，月度，观察期标在实体经济表里。它用来把名义利率换成近似实际利率，并把各国放在同一张增长—通胀图上。发布有滞后，所以不一定是本月。",
  },
  {
    id: "policy",
    name: "短端利率",
    x: 570,
    y: 78,
    blurb: "政策利率的市场锚。",
    mechanism:
      "用美国 3 个月国库券收益率代表短端，不是联邦基金目标利率本身。市场会把降息或加息预期先写进这段收益率，央行决议往往确认它。",
  },
  {
    id: "real",
    name: "实际利率",
    x: 810,
    y: 78,
    blurb: "名义长端减去通胀。",
    mechanism:
      "近似公式：实际利率 ≈ 美国 10 年期名义收益率 − 美国 CPI 月度同比。CPI 有发布滞后，所以这是量级，不是精确的 TIPS 实际收益率。黄金和长久期资产主要看它。",
  },
  {
    id: "unemp",
    name: "失业",
    x: 110,
    y: 230,
    blurb: "滞后、但比较硬的周期指标。",
    mechanism:
      "节点上是美国失业率，月度、季调。失业上升通常说明需求已经转弱。它来得晚，所以市场经常先交易其他指标，再用失业去确认。",
  },
  {
    id: "gdp",
    name: "增长",
    x: 340,
    y: 230,
    blurb: "盈利的来源，也是过热的来源。",
    mechanism:
      "节点上是美国实际 GDP 同比，季度。增长走两条方向相反的路：一条改善企业现金流，支撑股市；一条抬高中性利率，压低估值。净效果要看当时哪条更紧。",
  },
  {
    id: "y10",
    name: "十年国债",
    x: 570,
    y: 230,
    blurb: "全球资产的贴现率锚。",
    mechanism:
      "美国 10 年期国债收益率把三件事包在一个价格里：实际增长、通胀预期、期限溢价。它不是政策利率，但几乎所有长久期资产都拿它做贴现率。",
  },
  {
    id: "dxy",
    name: "美元",
    x: 810,
    y: 230,
    blurb: "一篮子美元的相对价格。",
    mechanism:
      "美元指数上升表示美元对一篮子货币更强。驱动通常是利差、增长差和避险。美元强时，以美元计价的黄金承压，美元兑人民币的数值往往上升。",
  },
  {
    id: "copper",
    name: "铜价",
    x: 110,
    y: 382,
    blurb: "工业需求的市场体温计。",
    mechanism:
      "铜用于电力、建筑和制造业。全球需求旺的时候铜价常常先动，所以交易员叫它“铜博士”。它是增长的市场版本，不是统计部门的 GDP。",
  },
  {
    id: "equity",
    name: "股市",
    x: 340,
    y: 382,
    blurb: "同时交易盈利和贴现率。",
    mechanism:
      "图上的代表指数是标普 500，下面另有恒生、上证、日经、DAX 等。股价大约等于盈利除以贴现率。增长管盈利，十年期和恐慌指数管贴现率，所以股市不是利率的单函数。",
  },
  {
    id: "vix",
    name: "恐慌指数",
    x: 570,
    y: 382,
    blurb: "风险溢价的市场价格。",
    mechanism:
      "VIX 是标普 500 期权的 30 天隐含波动率，不是情绪调查问卷。它上升表示投资者愿意为下跌保护付更多钱。近月高于 3 个月，叫做期限结构倒挂，常见于压力市。",
  },
  {
    id: "gold",
    name: "黄金",
    x: 810,
    y: 382,
    blurb: "无息资产，看机会成本。",
    mechanism:
      "黄金不支付利息。实际利率是持有它的机会成本，美元是计价货币，避险是第三股力量。三股力量可以同时存在，所以金价有时会和名义利率脱节。",
  },
  {
    id: "fx",
    name: "美元/人民币",
    x: 810,
    y: 508,
    blurb: "数值上升表示人民币更弱。",
    mechanism:
      "报价是 1 美元兑换多少人民币。美元指数、中美利差和增长差是主驱动。它和港币不同：港币有联系汇率，人民币这条没有钉死。",
  },
];

export const EDGES: LogicEdge[] = [
  {
    id: "oil-cpi",
    from: "oil",
    to: "cpi",
    sign: "+",
    tag: "成本",
    note: "能源进入交通、电力和部分食品。油价上升会把 CPI 往上推，通常滞后数周到数月。",
  },
  {
    id: "gdp-cpi",
    from: "gdp",
    to: "cpi",
    sign: "+",
    tag: "需求",
    note: "产出缺口为正、需求强时，企业更有能力提价。这是需求拉动型通胀。",
  },
  {
    id: "unemp-gdp",
    from: "unemp",
    to: "gdp",
    sign: "-",
    tag: "奥肯",
    note: "奥肯定律：失业率上升，通常对应实际产出低于潜力。失业滞后，但比调查类指标硬。",
  },
  {
    id: "copper-gdp",
    from: "copper",
    to: "gdp",
    sign: "+",
    tag: "铜博士",
    note: "工业金属需求对制造业敏感。铜价是增长的市场读数，统计 GDP 会晚一截才公布。",
  },
  {
    id: "cpi-policy",
    from: "cpi",
    to: "policy",
    sign: "+",
    tag: "泰勒",
    note: "泰勒规则的核心：通胀高于目标，政策利率应当上修。短端收益率会先把这个预期写进去。",
  },
  {
    id: "gdp-policy",
    from: "gdp",
    to: "policy",
    sign: "+",
    tag: "过热",
    note: "增长过热时中性利率上移，央行更倾向收紧，以免以后用更高的利率去压通胀。",
  },
  {
    id: "unemp-policy",
    from: "unemp",
    to: "policy",
    sign: "-",
    tag: "宽松",
    note: "失业明显上升会提高降息的概率。政策往往晚于市场已经定好的短端利率。",
  },
  {
    id: "policy-y10",
    from: "policy",
    to: "y10",
    sign: "+",
    tag: "锚",
    note: "短端是整条曲线的锚。十年期不会机械地跟着平移，上面还有增长预期和期限溢价。",
  },
  {
    id: "cpi-y10",
    from: "cpi",
    to: "y10",
    sign: "+",
    tag: "预期",
    note: "名义长端里含着通胀预期。预期上升时，即使实际利率不变，十年期也会上去。",
  },
  {
    id: "gdp-y10",
    from: "gdp",
    to: "y10",
    sign: "+",
    tag: "增长",
    note: "更强的实际增长对应更高的实际利率。避险买盘强的时候，这条会被暂时盖住。",
  },
  {
    id: "y10-real",
    from: "y10",
    to: "real",
    sign: "+",
    tag: "名义",
    note: "实际利率 ≈ 十年期名义收益率 − 通胀。名义长端上升，会直接抬高这个近似值。",
  },
  {
    id: "cpi-real",
    from: "cpi",
    to: "real",
    sign: "-",
    tag: "减通胀",
    note: "同样的名义利率，通胀越高，实际利率越低。这是定义里的减项，不是相关碰巧为负。",
  },
  {
    id: "policy-dxy",
    from: "policy",
    to: "dxy",
    sign: "+",
    tag: "利差",
    note: "美国短端相对其他货币越高，持有美元的利差越有吸引力，美元指数往往偏强。",
  },
  {
    id: "y10-dxy",
    from: "y10",
    to: "dxy",
    sign: "+",
    tag: "资本",
    note: "长端利差也引导资本流动，方向通常与短端相同。增长差或全球避险可以把它反过来。",
  },
  {
    id: "real-gold",
    from: "real",
    to: "gold",
    sign: "-",
    tag: "机会成本",
    note: "黄金不生息。实际利率上升时，持有黄金的机会成本变高，金价通常承压。",
  },
  {
    id: "dxy-gold",
    from: "dxy",
    to: "gold",
    sign: "-",
    tag: "计价",
    note: "黄金以美元计价。美元指数上升时，非美买家的购买力下降，金价常常回落。",
  },
  {
    id: "dxy-fx",
    from: "dxy",
    to: "fx",
    sign: "+",
    tag: "美元强",
    note: "美元指数走强时，美元兑人民币的报价通常上升，也就是人民币更弱。幅度还看中美利差。",
  },
  {
    id: "y10-equity",
    from: "y10",
    to: "equity",
    sign: "-",
    tag: "贴现",
    note: "股票是长久期资产。十年期上升等于贴现率上升，未来现金流的现值下降。",
  },
  {
    id: "gdp-equity",
    from: "gdp",
    to: "equity",
    sign: "+",
    tag: "盈利",
    note: "增长改善企业收入和现金流。这条和贴现率渠道方向相反，所以股市可以在加息初期继续涨。",
  },
  {
    id: "policy-equity",
    from: "policy",
    to: "equity",
    sign: "-",
    tag: "融资",
    note: "短端是融资成本和无风险利率。短端上升会压缩估值，并提高企业的利息负担。",
  },
  {
    id: "vix-equity",
    from: "vix",
    to: "equity",
    sign: "-",
    tag: "风险溢价",
    note: "VIX 上升表示下跌保护变贵。投资者要求更高的风险补偿时，股价先跌。",
  },
  {
    id: "equity-vix",
    from: "equity",
    to: "vix",
    sign: "-",
    tag: "去杠杆",
    note: "指数急跌会触发减仓和买保护，隐含波动率被推高。恐慌指数既是原因，也是结果。",
  },
  {
    id: "unemp-vix",
    from: "unemp",
    to: "vix",
    sign: "+",
    tag: "衰退",
    note: "劳动力市场恶化会被读成衰退交易。避险需求上升时，近月波动率往往先动。",
  },
  {
    id: "oil-equity",
    from: "oil",
    to: "equity",
    sign: "±",
    tag: "两面",
    note: "油价上涨利好能源盈利，但侵蚀居民实际收入，也可能抬高贴现率。净效果取决于是需求还是供给。",
  },
];

export function consistency(sign: Sign, rho: number | null): string {
  if (rho == null || Number.isNaN(rho)) return "没有足够重叠的日频样本。宏观序列不进相关矩阵。";
  if (sign === "±") return "这条机制本身是条件式的，相关可正可负。";
  if (Math.abs(rho) < 0.15) return "近 60 个共同交易日里关系很弱，方向不稳定。";
  const same = (sign === "+" && rho > 0) || (sign === "-" && rho < 0);
  return same
    ? "近 60 日的价格方向与这条机制一致。相关不是因果。"
    : "近 60 日的价格方向与这条机制相反，说明市场还在交易别的因素。相关不是因果。";
}

export function buildNarrative(input: {
  vix: number | null;
  vix3m: number | null;
  tnx: number | null;
  irx: number | null;
  y2: number | null;
  spxRet20: number | null;
  dxyRet20: number | null;
  cpi: number | null;
  gdp: number | null;
  cpiAsOf: string | null;
  gdpAsOf: string | null;
}): { title: string; body: string } {
  const { vix, vix3m, tnx, irx, y2, spxRet20, dxyRet20, cpi, gdp, cpiAsOf, gdpAsOf } = input;
  const curve3 = tnx != null && irx != null ? (tnx - irx) * 100 : null;
  const backwd = vix != null && vix3m != null && vix > vix3m + 0.4;
  const vixStress = vix != null && vix >= 25;
  const vixCalm = vix != null && vix < 16;
  const inverted = curve3 != null && curve3 < 0;

  let title = "利率与波动都没有给出极端信号";
  if (vixStress && inverted) title = "压力加上曲线倒挂：市场在给衰退风险定价";
  else if (backwd && vixStress) title = "波动率倒挂，而且近月已经进入压力区";
  else if (backwd) title = "波动率期限结构倒挂：近端恐慌高于远期";
  else if (vixCalm && !inverted) title = "低波、曲线为正：更接近软着陆，而不是衰退";
  else if (inverted) title = "短端高于长端：降息预期压过了当前的政策利率";

  const parts: string[] = [];
  if (spxRet20 != null) {
    parts.push(
      `标普 500 近 20 个交易日${spxRet20 >= 0 ? "上涨" : "下跌"} ${(Math.abs(spxRet20) * 100).toFixed(1)}%。`,
    );
  }
  if (vix != null) {
    const band =
      vix < 16 ? "偏低，风险溢价不便宜也不恐慌" : vix < 25 ? "处于常见区间" : vix < 35 ? "已经进入压力区" : "处于恐慌区";
    const term =
      vix3m == null
        ? ""
        : vix > vix3m
          ? `近月高于 3 个月 VIX（${vix3m.toFixed(1)}），期限结构倒挂，近端避险需求更强。`
          : `近月低于 3 个月 VIX（${vix3m.toFixed(1)}），期限结构正常。`;
    parts.push(`VIX ${vix.toFixed(1)}，${band}。${term}`);
  }
  if (tnx != null && irx != null && curve3 != null) {
    parts.push(
      `美国 10 年期 ${tnx.toFixed(2)}%，3 个月国库券 ${irx.toFixed(2)}%，利差 ${curve3.toFixed(0)} 个基点。${
        curve3 >= 0
          ? "正斜率表示市场还没把持续降息当成基准情形。"
          : "倒挂表示市场预期未来政策利率会降到现短端之下。倒挂常与衰退概率一起被引用，但它本身不是衰退。"
      }`,
    );
  }
  if (y2 != null && tnx != null) {
    parts.push(
      `10 年减 2 年期收益率期货约 ${((tnx - y2) * 100).toFixed(0)} 个基点。这里的 2 年期是收益率期货，不是现券到期收益率。`,
    );
  }
  if (tnx != null && cpi != null) {
    parts.push(
      `近似实际利率 ${(tnx - cpi).toFixed(2)}%（10 年期减美国 CPI 同比 ${cpi.toFixed(2)}%，观察期 ${cpiAsOf ?? "未标明"}，有发布滞后）。`,
    );
  }
  if (gdp != null) {
    parts.push(
      `美国实际 GDP 同比 ${gdp.toFixed(2)}%（${gdpAsOf ?? "观察期未标明"}）。增长走盈利渠道支撑股市，同时会把中性利率推高。`,
    );
  }
  if (dxyRet20 != null) {
    parts.push(
      `美元指数近 20 日${dxyRet20 >= 0 ? "上升" : "下降"} ${(Math.abs(dxyRet20) * 100).toFixed(1)}%。美元走强通常压黄金，并让美元兑人民币的数值上升。`,
    );
  }
  parts.push("这是传导机制的读法，不是买卖建议。");
  return { title, body: parts.join("") };
}
