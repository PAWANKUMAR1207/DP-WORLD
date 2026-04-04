import { useState } from "react";
import API_BASE from "../utils/config";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";

const emptyRegisterForm = {
  user_id: "",
  password: "",
  full_name: "",
  email: "",
  phone: "",
  role_title: "Customs Manager",
  badge_id: "",
  department: "Customs Risk Office",
  terminal: "",
  shift_name: "",
};

export default function AuthPortal({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ user_id: "", password: "" });
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const text = await response.text();
      if (!text) throw new Error(`Server returned empty response (HTTP ${response.status})`);
      const payload = JSON.parse(text);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Login failed");
      }
      onLoginSuccess(payload.user);
    } catch (err) {
      setMessage(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const text = await response.text();
      if (!text) throw new Error(`Server returned empty response (HTTP ${response.status})`);
      const payload = JSON.parse(text);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Registration failed");
      }
      setMode("login");
      setLoginForm({ user_id: registerForm.user_id, password: registerForm.password });
      setMessage("Registration complete. You can sign in with the new user ID and password.");
      setRegisterForm(emptyRegisterForm);
    } catch (err) {
      setMessage(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center px-5 py-10 sm:px-6 lg:px-8">
        <section className="grid w-full max-w-[1280px] gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(540px,0.85fr)]">
          <div className="rounded-[32px] border border-slate-200 bg-white px-7 py-8 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-sm font-bold tracking-[0.2em] text-white">
                GS
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">GhostShip</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Port Intelligence System</h1>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customs Manager Access</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Secure the floor before opening the dashboard</h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Sign in as a customs manager or register a new manager account. The form fields and visual language match the dashboard so the handoff feels seamless during demo.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <FeatureCard title="Inspection Oversight" body="Keep audit ownership, active reviews, and terminal activity aligned to the right manager." />
              <FeatureCard title="Risk Operations" body="Move from intake to flagged shipment review and escalation without leaving the workspace." />
              <FeatureCard title="Manager Identity" body="Store manager details in MySQL so the login belongs to a real operations account." />
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white px-7 py-8 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
            <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "login" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "register" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                Register
              </button>
            </div>

            {mode === "login" ? (
              <div className="mt-6 space-y-4">
                <Header icon={LogIn} title="Manager Login" subtitle="Use your customs manager user ID and password to enter the operations dashboard." />
                <Field label="User ID">
                  <input
                    value={loginForm.user_id}
                    onChange={(event) => setLoginForm((current) => ({ ...current, user_id: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    placeholder="manager01"
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                    placeholder="Enter password"
                  />
                </Field>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Signing In..." : "Enter Dashboard"}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <Header icon={UserPlus} title="Register Customs Manager" subtitle="Create a manager profile. These fields are stored in MySQL exactly as entered, including the password." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full Name"><Input value={registerForm.full_name} onChange={(value) => setRegisterForm((c) => ({ ...c, full_name: value }))} placeholder="Pawan Kumar" /></Field>
                  <Field label="User ID"><Input value={registerForm.user_id} onChange={(value) => setRegisterForm((c) => ({ ...c, user_id: value }))} placeholder="manager01" /></Field>
                  <Field label="Password"><Input type="password" value={registerForm.password} onChange={(value) => setRegisterForm((c) => ({ ...c, password: value }))} placeholder="Create password" /></Field>
                  <Field label="Email"><Input value={registerForm.email} onChange={(value) => setRegisterForm((c) => ({ ...c, email: value }))} placeholder="manager@port.local" /></Field>
                  <Field label="Phone"><Input value={registerForm.phone} onChange={(value) => setRegisterForm((c) => ({ ...c, phone: value }))} placeholder="+91 99999 99999" /></Field>
                  <Field label="Badge ID"><Input value={registerForm.badge_id} onChange={(value) => setRegisterForm((c) => ({ ...c, badge_id: value }))} placeholder="CM-4172" /></Field>
                  <Field label="Role Title"><Input value={registerForm.role_title} onChange={(value) => setRegisterForm((c) => ({ ...c, role_title: value }))} placeholder="Customs Manager" /></Field>
                  <Field label="Department"><Input value={registerForm.department} onChange={(value) => setRegisterForm((c) => ({ ...c, department: value }))} placeholder="Customs Risk Office" /></Field>
                  <Field label="Terminal"><Input value={registerForm.terminal} onChange={(value) => setRegisterForm((c) => ({ ...c, terminal: value }))} placeholder="Terminal 4" /></Field>
                  <Field label="Shift"><Input value={registerForm.shift_name} onChange={(value) => setRegisterForm((c) => ({ ...c, shift_name: value }))} placeholder="Morning Shift" /></Field>
                </div>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Registering..." : "Create Manager Account"}
                </button>
              </div>
            )}

            {message ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Demo note: password storage is currently plain text because you explicitly requested no encryption.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Header({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
      placeholder={placeholder}
    />
  );
}

function FeatureCard({ title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}
