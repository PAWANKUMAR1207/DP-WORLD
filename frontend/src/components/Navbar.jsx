import { UserCircle2 } from "lucide-react";

const navItems = [
  { id: "operations", label: "Operations" },
  { id: "analysis", label: "Shipment Analysis" },
  { id: "monitoring", label: "Risk Monitoring" },
  { id: "audit", label: "Audit Queue" },
];

export default function Navbar({ activeView, setActiveView, officerProfile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold tracking-[0.2em] text-white shadow-sm">
            GS
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">GhostShip</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Port Intelligence System</h1>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition hover:scale-[1.01] ${
                activeView === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView("profile")}
            className={`hidden items-center gap-3 rounded-2xl border bg-white px-3 py-2 shadow-sm transition hover:scale-[1.01] lg:flex ${
              activeView === "profile" ? "border-slate-300 ring-2 ring-slate-200" : "border-slate-200"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-600">
              {officerProfile.photo_url ? (
                <img src={officerProfile.photo_url} alt={officerProfile.full_name} className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{officerProfile.full_name}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {officerProfile.role_title} | {officerProfile.badge_id}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("profile")}
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:scale-[1.01] hover:text-slate-900 lg:hidden"
            title={`${officerProfile.full_name} | ${officerProfile.role_title}`}
          >
            {officerProfile.photo_url ? (
              <img src={officerProfile.photo_url} alt={officerProfile.full_name} className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
