import { Clock3 } from "lucide-react";

export default function AuditQueue({ rows }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audit Queue</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Escalation Workflow</h2>
        </div>
        <Clock3 className="h-5 w-5 text-slate-400" />
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.shipmentId} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{row.shipmentId}</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{row.stage}</p>
            </div>
            <div className="grid gap-1 text-sm text-slate-600 md:justify-items-end">
              <span>{row.owner}</span>
              <strong className="text-slate-900">{row.eta}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
