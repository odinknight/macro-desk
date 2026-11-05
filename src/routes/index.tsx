import { createFileRoute } from "@tanstack/react-router";
import { MarketBoard } from "@/components/market-board";
import { getBoard } from "@/lib/market.functions";

export const Route = createFileRoute("/")({
  loader: () => getBoard({ data: { fresh: false } }),
  pendingComponent: Pending,
  component: Home,
});

function Pending() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs tracking-widest text-accent">MACRO DESK</p>
      <h1 className="mt-2 font-display text-3xl">宏观传导台</h1>
      <p className="mt-3 text-sm text-muted">正在取股市、汇率、国债和宏观数据…</p>
    </main>
  );
}

function Home() {
  const initial = Route.useLoaderData();
  return <MarketBoard initial={initial} />;
}
