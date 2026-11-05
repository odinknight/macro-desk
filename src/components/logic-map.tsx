import { EDGES, NODES, type NodeId } from "@/lib/economics";

type Props = {
  selected: NodeId;
  onSelect: (id: NodeId) => void;
  values: Partial<Record<NodeId, string>>;
};

const HW = 74;
const HH = 30;

function port(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) * HH > Math.abs(dy) * HW) {
    const sx = Math.sign(dx) || 1;
    const y = from.y + (dx === 0 ? 0 : (dy / dx) * sx * HW);
    return { x: from.x + sx * HW, y };
  }
  const sy = Math.sign(dy) || 1;
  const x = from.x + (dy === 0 ? 0 : (dx / dy) * sy * HH);
  return { x, y: from.y + sy * HH };
}

function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const p = port(a, b);
  const q = port(b, a);
  const mx = (p.x + q.x) / 2;
  return { d: `M ${p.x} ${p.y} C ${mx} ${p.y}, ${mx} ${q.y}, ${q.x} ${q.y}`, mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } };
}

export function LogicMap({ selected, onSelect, values }: Props) {
  const linked = new Set<NodeId>([selected]);
  for (const edge of EDGES) {
    if (edge.from === selected || edge.to === selected) {
      linked.add(edge.from);
      linked.add(edge.to);
    }
  }
  const byId = new Map(NODES.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 960 560" className="h-auto w-full" role="group" aria-label="宏观传导图">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="currentColor" />
        </marker>
      </defs>
      {EDGES.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const active = edge.from === selected || edge.to === selected;
        const { d } = curve(a, b);
        const color = edge.sign === "+" ? "var(--color-up)" : edge.sign === "-" ? "var(--color-down)" : "var(--color-muted)";
        return (
          <g key={edge.id} opacity={active ? 1 : 0.16}>
            <path d={d} fill="none" stroke={color} strokeWidth={active ? 2.25 : 1.2} markerEnd="url(#arrow)" />
          </g>
        );
      })}
      {NODES.map((node) => {
        const on = node.id === selected;
        const dim = !linked.has(node.id);
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={node.name}
            opacity={dim ? 0.42 : 1}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x={node.x - HW}
              y={node.y - HH}
              width={HW * 2}
              height={HH * 2}
              rx="12"
              fill="var(--color-surface)"
              stroke={on ? "var(--color-accent)" : "var(--color-border)"}
              strokeWidth={on ? 2 : 1}
            />
            <text x={node.x} y={node.y - 6} textAnchor="middle" fill="var(--color-fg)" fontSize="14">
              {node.name}
            </text>
            <text x={node.x} y={node.y + 14} textAnchor="middle" fill="var(--color-accent)" fontSize="12">
              {values[node.id] ?? "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
