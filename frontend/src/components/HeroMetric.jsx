import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { toPolyline } from "../utils/formatters";

function Sparkline({ points }) {
  const polyline = toPolyline(points)
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${x},${(y / 100) * 40}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-10 w-28">
      <polyline fill="none" stroke="#0f4c81" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
    </svg>
  );
}

export default function HeroMetric({ card }) {
  const TrendIcon = card.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const trendTone =
    card.direction === "up"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : "text-amber-700 bg-amber-50 ring-amber-200";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{card.description}</p>
        </div>
        <div className="flex flex-col items-start gap-3 xl:items-end">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${trendTone}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {card.trend}
          </span>
          <Sparkline points={card.sparkline} />
          <p className="text-xs text-slate-400">{card.updated}</p>
        </div>
      </div>
    </article>
  );
}
