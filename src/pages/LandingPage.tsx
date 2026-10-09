import { useState, useEffect, FormEvent, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme, ThemePreference } from "../context/ThemeContext";

// ── Coverage Plan IDs ────────────────────────────────────────────────────
export type PlanId = "8hr" | "247-standard" | "247-priority" | "custom";

// ── 5-Category Simulation Scenarios ─────────────────────────────────────
interface Scenario {
  id: string;
  categoryLabel: string;
  icon: string;
  accentClass: string;
  darkAccentClass: string;
  title: string;
  client: string;
  urgency: string;
  slaText: string;
  slaSeconds: number;
  tech: {
    name: string;
    role: string;
    distanceText: string;
    matchScore: number;
    note: string;
    checks: string[];
  };
  stage: number; // 0-4
}

const SCENARIOS: Scenario[] = [
  {
    id: "hvac",
    categoryLabel: "Commercial HVAC",
    icon: "❄️",
    accentClass: "border-cyan-400/60 text-cyan-700",
    darkAccentClass: "dark:border-cyan-500/40 dark:text-cyan-300",
    title: "WO-2041 · Central Chiller Shutdown & Compressor Tripping",
    client: "Apex Retail Galleria · Ground Floor Outlets",
    urgency: "Urgent",
    slaText: "20-Min Priority SLA",
    slaSeconds: 1145,
    tech: {
      name: "Tariqul Alam",
      role: "HVAC & Industrial Chiller Specialist",
      distanceText: "1.4 km · ETA 7 mins",
      matchScore: 96,
      note: "Certified refrigerant handling, diagnostic kit ready, on-duty within 2 km.",
      checks: ["HVAC Certified", "Free Now", "7 mins away", "Kit ready"],
    },
    stage: 3,
  },
  {
    id: "electrical",
    categoryLabel: "Electrical & Power",
    icon: "⚡",
    accentClass: "border-amber-400/60 text-amber-700",
    darkAccentClass: "dark:border-amber-500/40 dark:text-amber-300",
    title: "WO-1054 · 500 KVA Industrial Generator Voltage Drop",
    client: "ABC Manufacturing Ltd · Production Line 2",
    urgency: "Urgent",
    slaText: "40-Min Standard SLA",
    slaSeconds: 2310,
    tech: {
      name: "Rahim Ahmed",
      role: "High-Voltage Power & Generator Engineer",
      distanceText: "3.2 km · ETA 14 mins",
      matchScore: 94,
      note: "Safety electrical license verified, zero schedule conflicts, 14 min from factory.",
      checks: ["HV Licensed", "Free Now", "14 mins", "Low workload"],
    },
    stage: 3,
  },
  {
    id: "security",
    categoryLabel: "CCTV & Security",
    icon: "📹",
    accentClass: "border-purple-400/60 text-purple-700",
    darkAccentClass: "dark:border-purple-500/40 dark:text-purple-300",
    title: "WO-3088 · Perimeter CCTV Offline & DVR Network Failure",
    client: "Northstar Logistics Hub · Warehouse Zone B",
    urgency: "High Priority",
    slaText: "40-Min Standard SLA",
    slaSeconds: 1680,
    tech: {
      name: "Tanvir Hasan",
      role: "Surveillance & Access Control Technician",
      distanceText: "2.1 km · ETA 11 mins",
      matchScore: 91,
      note: "IP camera & NVR certified, testing rig in vehicle, closest verified technician.",
      checks: ["NVR/IP Cert", "Available", "11 mins", "Rig ready"],
    },
    stage: 2,
  },
  {
    id: "it",
    categoryLabel: "IT & Networking",
    icon: "💻",
    accentClass: "border-emerald-400/60 text-emerald-700",
    darkAccentClass: "dark:border-emerald-500/40 dark:text-emerald-300",
    title: "WO-4012 · Core Switch Reboot Loop & POS Connectivity Down",
    client: "Metro Mart Superstore · 8 Cash Counters",
    urgency: "Urgent",
    slaText: "20-Min Priority SLA",
    slaSeconds: 980,
    tech: {
      name: "Saif Chowdhury",
      role: "Network Infrastructure & Systems Engineer",
      distanceText: "1.8 km · ETA 9 mins",
      matchScore: 95,
      note: "Network hardware certified, replacement switch in dispatch buffer.",
      checks: ["Net Certified", "On Standby", "9 mins", "Spare HW"],
    },
    stage: 3,
  },
  {
    id: "facility",
    categoryLabel: "Facility Upkeep",
    icon: "🛠️",
    accentClass: "border-rose-400/60 text-rose-700",
    darkAccentClass: "dark:border-rose-500/40 dark:text-rose-300",
    title: "WO-5023 · Automatic Glass Entry Door Jam & Rail Misalignment",
    client: "Crown Corporate Plaza · Main Lobby",
    urgency: "Active",
    slaText: "40-Min Standard SLA",
    slaSeconds: 2240,
    tech: {
      name: "Kamrul Islam",
      role: "Commercial Facility & Mechanical Fitter",
      distanceText: "2.8 km · ETA 13 mins",
      matchScore: 89,
      note: "Commercial door specialist, standard parts in mobile unit, verified available.",
      checks: ["Facility Lic.", "Free Now", "13 mins", "Parts stocked"],
    },
    stage: 2,
  },
];

const WORKFLOW_STEPS = [
  { step: 1, icon: "📋", title: "Subscribe", body: "Choose a coverage plan with a defined operational window and arrival SLA for your facilities." },
  { step: 2, icon: "🚨", title: "Report the issue", body: "Select the trade category and submit your breakdown request from any browser or device." },
  { step: 3, icon: "🧭", title: "Dispatcher reviews", body: "Our operations desk evaluates verified certifications, travel distance, and current workload." },
  { step: 4, icon: "⚡", title: "Technician arrives", body: "Your qualified professional reaches your premises within the committed physical arrival window." },
  { step: 5, icon: "✅", title: "Sign-off & records", body: "Approve completed work, receive a digital sign-off, and access itemised equipment history." },
];

// ── Theme Selector Icon Component ────────────────────────────────────────
function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "system", label: "System", icon: "💻" },
  ];

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.label}
          aria-pressed={preference === o.value}
          onClick={() => setPreference(o.value)}
          className={`rounded-md px-2 py-1 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            preference === o.value
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span className="mr-0.5">{o.icon}</span>
          <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Logo Mark ────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1F6B7B] to-[#0e4a57] shadow-md group-hover:shadow-[0_0_16px_rgba(56,189,248,0.4)] transition-all duration-300"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7de8f8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="group-hover:rotate-6 transition-transform duration-300"
      >
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    </div>
  );
}

// ── Check Icon ───────────────────────────────────────────────────────────
interface CheckIconProps {
  className?: string;
  style?: CSSProperties;
}

function CheckIcon({ className = "", style }: CheckIconProps) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 ${className}`}
      style={style}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  // Page title
  useEffect(() => {
    document.title = "VoltOps | Field Service Coordination Platform";
  }, []);

  // Sticky nav shadow
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Mobile menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Active console scenario
  const [activeId, setActiveId] = useState("hvac");
  const scenario = SCENARIOS.find((s) => s.id === activeId)!;

  // Countdown timers per scenario
  const [times, setTimes] = useState<Record<string, number>>(() =>
    Object.fromEntries(SCENARIOS.map((s) => [s.id, s.slaSeconds]))
  );
  useEffect(() => {
    const t = setInterval(
      () =>
        setTimes((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])
          )
        ),
      1000
    );
    return () => clearInterval(t);
  }, []);
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Workflow step hover (hover-only, not persistent click)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Plan comparison expand
  const [showMatrix, setShowMatrix] = useState(false);

  // Contact form
  const [contactDone, setContactDone] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCompany, setCCompany] = useState("");
  const [cMsg, setCMsg] = useState("");

  const handleContact = (e: FormEvent) => {
    e.preventDefault();
    setContactDone(true);
    setCName(""); setCEmail(""); setCCompany(""); setCMsg("");
  };

  const handlePlan = (plan: PlanId) => {
    if (plan === "custom") {
      const el = document.getElementById("contact");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/register?package=${plan}`);
    }
  };

  // ── Shared utility class pieces ──────────────────────────────────────
  const card = "rounded-2xl border transition-all duration-200 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]";
  const surface = "bg-[var(--bg-surface)] border-[var(--border)]";
  const surface2 = "bg-[var(--bg-surface-2)] border-[var(--border)]";
  const textPrimary = "text-[var(--text-primary)]";
  const textSecondary = "text-[var(--text-secondary)]";
  const textMuted = "text-[var(--text-muted)]";
  const accent = "text-[var(--accent)]";
  const borderColor = "border-[var(--border)]";

  return (
    <div className="min-h-screen font-sans" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 border-b ${borderColor} transition-all duration-300 ${
          scrolled ? "backdrop-blur-xl shadow-[var(--shadow-sm)]" : ""
        }`}
        style={{ background: scrolled ? "var(--bg-overlay)" : "var(--bg-base)" }}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo + Brand */}
          <a href="#" className="flex items-center gap-3 group shrink-0">
            <LogoMark size={36} />
            <div className="flex flex-col leading-none">
              <span className={`font-bold text-[17px] tracking-tight ${textPrimary}`}>VoltOps</span>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${accent}`}>
                Field Service Platform
              </span>
            </div>
          </a>

          {/* Desktop nav links */}
          <div className={`hidden lg:flex items-center gap-7 text-sm font-medium ${textSecondary}`}>
            {["#services", "#how", "#dispatch", "#packages", "#about", "#contact"].map((href, i) => {
              const labels = ["Services", "How It Works", "Matching", "Plans", "About", "Contact"];
              return (
                <a key={href} href={href} className="hover:text-[var(--accent)] transition-colors">
                  {labels[i]}
                </a>
              );
            })}
          </div>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${borderColor} ${textSecondary} hover:text-[var(--accent)] transition-colors`}
            >
              Sign in
            </Link>
            <a
              href="#packages"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "var(--accent)" }}
            >
              Choose Plan
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`lg:hidden p-2 rounded-xl border ${borderColor} ${textMuted} hover:text-[var(--text-primary)]`}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className={`lg:hidden border-t ${borderColor} px-5 py-5 space-y-3`} style={{ background: "var(--bg-surface)" }}>
            <div className="pb-3 mb-3 border-b border-[var(--border)]">
              <ThemeToggle />
            </div>
            {[
              ["#services", "Services"],
              ["#how", "How It Works"],
              ["#dispatch", "Matching Engine"],
              ["#packages", "Plans"],
              ["#about", "About"],
              ["#contact", "Contact"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 border-b border-[var(--border)] text-sm font-medium ${textSecondary} hover:text-[var(--accent)]`}
              >
                {label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/login"
                className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold border ${borderColor} ${textPrimary}`}
              >
                Sign in
              </Link>
              <a
                href="#packages"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                Choose a Plan
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── HERO SECTION ─────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden py-16 lg:py-24">
        {/* Dark: ambient glow blobs. Light: subtle warm radial */}
        {isDark ? (
          <>
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full blur-[120px] pointer-events-none animate-ambient-drift"
              style={{ background: "rgba(56,189,248,0.08)" }} />
            <div className="absolute top-1/3 right-10 w-[28rem] h-[28rem] rounded-full blur-[100px] pointer-events-none animate-pulse-subtle"
              style={{ background: "rgba(20,184,166,0.07)" }} />
            <div className="absolute inset-0 pointer-events-none opacity-15" style={{
              backgroundImage: "radial-gradient(rgba(56,189,248,0.25) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, #000 20%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, #000 20%, transparent 80%)",
            }} />
          </>
        ) : (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 60% at 40% 40%, rgba(31,107,123,0.06) 0%, transparent 70%)",
          }} />
        )}

        <div className="relative max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

            {/* Left — Hero Copy */}
            <div className="lg:col-span-6 space-y-7">
              <h1 className={`leading-[1.1] tracking-tight font-extrabold text-4xl sm:text-5xl lg:text-[52px] ${textPrimary}`}>
                One service plan.{" "}
                <span style={{ color: "var(--accent)" }}>The right professional.</span>{" "}
                When your business needs one.
              </h1>
              <p className={`text-base sm:text-lg leading-relaxed max-w-xl ${textSecondary}`}>
                VoltOps coordinates qualified professionals across electrical, HVAC, security, IT,
                and facility maintenance — backed by defined coverage windows and physical arrival commitments.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href="#packages"
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "var(--accent)" }}
                >
                  Explore Coverage Plans
                </a>
                <a
                  href="#how"
                  className={`px-6 py-3.5 rounded-xl font-semibold text-sm border ${borderColor} ${textSecondary} hover:text-[var(--accent)] transition-colors`}
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Right — Simulated Dispatch Console */}
            <div className="lg:col-span-6">
              <div
                className={`rounded-2xl border p-5 sm:p-6 ${borderColor}`}
                style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)" }}
              >
                {/* Console header */}
                <div className={`flex items-center justify-between pb-4 mb-1 border-b ${borderColor}`}>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>
                      Simulated Dispatch Console
                    </span>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${borderColor} ${textMuted}`}>
                    Interactive Demo
                  </span>
                </div>

                {/* Category tabs */}
                <div className={`flex gap-1.5 overflow-x-auto py-3 border-b ${borderColor} no-scrollbar`}>
                  {SCENARIOS.map((s) => {
                    const isActive = s.id === activeId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                          isActive
                            ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-surface-2)]"
                            : `border-[var(--border)] ${textMuted} hover:text-[var(--text-primary)]`
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span>{s.categoryLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scenario body */}
                <div className="mt-4 space-y-3">
                  {/* Job header */}
                  <div className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${borderColor}`}
                    style={{ background: "var(--bg-surface-2)" }}>
                    <div className="min-w-0">
                      <span className={`text-xs font-semibold block ${accent}`}>{scenario.categoryLabel}</span>
                      <h3 className={`text-sm font-bold mt-0.5 leading-snug ${textPrimary}`}>{scenario.title}</h3>
                      <p className={`text-xs mt-0.5 ${textMuted}`}>{scenario.client}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        {scenario.urgency}
                      </span>
                      <div className={`text-xs font-mono font-bold mt-1.5 ${accent}`}>
                        ETA {fmt(times[scenario.id] ?? 0)}
                      </div>
                      <span className={`text-[10px] ${textMuted}`}>{scenario.slaText}</span>
                    </div>
                  </div>

                  {/* Technician match */}
                  <div className={`p-3.5 rounded-xl border-2 space-y-2.5`}
                    style={{ borderColor: "var(--accent)", background: "var(--bg-surface-2)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${textPrimary}`}>{scenario.tech.name}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            {scenario.tech.matchScore}% Match
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${textSecondary}`}>
                          {scenario.tech.role} · {scenario.tech.distanceText}
                        </p>
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed border-t pt-2 ${textMuted}`}
                      style={{ borderColor: "var(--border)" }}>
                      <span className={`font-semibold ${textSecondary}`}>Dispatcher note:</span>{" "}
                      {scenario.tech.note}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {scenario.tech.checks.map((c, i) => (
                        <span key={i} className="flex items-center gap-1">✓ {c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Pipeline */}
                  <div className={`p-3 rounded-xl border ${borderColor}`} style={{ background: "var(--bg-surface-2)" }}>
                    <div className={`flex justify-between text-[11px] mb-2 ${textMuted}`}>
                      <span className={`font-semibold ${textSecondary}`}>Simulated job pipeline:</span>
                      <span className={accent}>En Route to Site</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                      {["Reported","Reviewed","Assigned","En Route","On Site"].map((label, i) => (
                        <div key={i} className={`py-1 rounded transition-colors ${
                          i < 3
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : i === 3
                              ? "bg-blue-100 text-blue-700 font-bold dark:bg-blue-500/25 dark:text-blue-300"
                              : `${textMuted}`
                        }`} style={i >= 4 ? { background: "var(--bg-surface)", border: "1px solid var(--border)" } : {}}>
                          {i + 1}. {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className={`text-[11px] text-center italic ${textMuted}`}>
                    Demonstration only. Human dispatchers confirm all assignments before work dispatch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Metrics Bar ─────────────────────────────────────────────────── */}
      <section className={`border-y ${borderColor} py-10`} style={{ background: "var(--bg-surface-2)" }}>
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-left">
          {[
            { val: "20 & 40 min", desc: "Physical technician arrival commitments", border: "var(--accent)" },
            { val: "5 Trades", desc: "HVAC, Electrical, Security, IT & Facilities", border: "#14b8a6" },
            { val: "100% Human", desc: "Dispatcher-confirmed assignments always", border: "#1E824C" },
            { val: "4 Plans", desc: "From 8-hr daily to custom coverage schedules", border: "#9333ea" },
          ].map(({ val, desc, border }) => (
            <div key={val} className="pl-4" style={{ borderLeft: `2px solid ${border}` }}>
              <div className={`text-2xl sm:text-3xl font-extrabold ${textPrimary}`}>{val}</div>
              <p className={`text-xs sm:text-sm mt-1 ${textMuted}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services Section ─────────────────────────────────────────────── */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>Unified Trade Coverage</span>
          <h2 className={`text-3xl sm:text-4xl font-extrabold ${textPrimary}`}>
            One subscription for every facility trade
          </h2>
          <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
            VoltOps coordinates vetted, licensed professionals across five core operational trades under a single unified coordination platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "⚡", accent: "#d97706", accentDark: "#fbbf24", label: "High & Low Voltage", title: "Electrical & Power Systems",
              desc: "Industrial generators, step-down transformers, commercial switchboards, UPS backups, and severe line faults.",
              bullets: ["Generator synchronization & AVR testing", "Phase imbalance & emergency restoration", "Transformer insulation inspection"] },
            { icon: "❄️", accent: "#0891b2", accentDark: "#38bdf8", label: "Climate & Ventilation", title: "Cooling & Mechanical HVAC",
              desc: "Commercial VRF/VRV units, rooftop chillers, ducted split systems, compressor failures, and refrigerant diagnostics.",
              bullets: ["Chiller & compressor breakdown", "VRF refrigerant recharge & vacuuming", "Scheduled air quality & filter cycles"] },
            { icon: "📹", accent: "#7c3aed", accentDark: "#a78bfa", label: "Perimeter & Access", title: "Security & Surveillance",
              desc: "IP CCTV cameras, DVR/NVR storage, biometric turnstiles, and electronic door strike malfunctions.",
              bullets: ["Camera feed restoration & lens alignment", "DVR/NVR raid reconfiguration", "Access control reader repairs"] },
            { icon: "💻", accent: "#059669", accentDark: "#34d399", label: "Hardware & Systems", title: "IT, Hardware & Networks",
              desc: "Office networking drops, rack cabling, core router crashes, POS downtime, and workstation hardware triage.",
              bullets: ["Managed switch & firewall diagnosis", "Server rack cable management", "POS terminal hardware replacement"] },
            { icon: "🛠️", accent: "#dc2626", accentDark: "#f87171", label: "Building Infrastructure", title: "Facility & Building Upkeep",
              desc: "Commercial repairs, door sensors, lighting fixture overhaul, and structural facility upkeep across business premises.",
              bullets: ["Partition wall & moisture barrier repair", "Commercial door alignment & sensors", "Lighting fixture resets & overhaul"] },
            { icon: "🎯", accent: "var(--accent)", accentDark: "var(--accent)", label: "Human-in-the-Loop", title: "Dedicated Dispatch Control",
              desc: "Every work order is reviewed by an experienced human dispatcher who evaluates credentials, tools, and proximity.",
              bullets: ["Transparent multi-factor candidate scoring", "Live SLA countdown enforcement", "Itemized digital invoices & equipment logs"],
              featured: true },
          ].map(({ icon, accent: ac, accentDark: acd, label, title, desc, bullets, featured }) => (
            <div
              key={title}
              className={`p-6 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
                featured ? "" : `hover:border-[var(--accent)] ${card}`
              }`}
              style={{
                background: featured
                  ? isDark
                    ? "linear-gradient(135deg, #0f1f2f 0%, #0e2432 100%)"
                    : "linear-gradient(135deg, #f0fafa 0%, #e6f4f7 100%)"
                  : "var(--bg-surface)",
                borderColor: featured ? "var(--accent)" : "var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 transition-transform group-hover:scale-110"
                style={{ background: isDark ? `${acd}20` : `${ac}18`, border: `1px solid ${isDark ? acd : ac}30` }}
              >
                {icon}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: isDark ? acd : ac }}>{label}</span>
              <h3 className={`text-base font-bold mt-1 mb-2 ${textPrimary}`}>{title}</h3>
              <p className={`text-xs leading-relaxed mb-3 ${textSecondary}`}>{desc}</p>
              <ul className="space-y-1.5">
                {bullets.map((b) => (
                  <li key={b} className={`flex items-center gap-2 text-xs ${textSecondary}`}>
                    <CheckIcon className="w-3.5 h-3.5" style={{ color: isDark ? acd : ac }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how" className={`py-24 border-t ${borderColor} relative overflow-hidden`}
        style={{ background: "var(--bg-surface-2)" }}>
        {isDark && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[20rem] rounded-full blur-[120px] pointer-events-none"
            style={{ background: "rgba(56,189,248,0.04)" }} />
        )}

        <div className="max-w-7xl mx-auto px-5 relative">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-14">
            <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>End-to-End Journey</span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold ${textPrimary}`}>
              How VoltOps resolves facility issues
            </h2>
            <p className={`text-sm sm:text-base ${textSecondary}`}>
              A clear, accountable path from subscription to on-site sign-off.
            </p>
          </div>

          {/* Desktop connected path */}
          <div className="hidden lg:block relative">
            {/* Connecting line */}
            <div className="absolute top-7 left-12 right-12 h-[2px] pointer-events-none"
              style={{ background: "linear-gradient(to right, var(--accent), #14b8a6, #1E824C)", opacity: 0.4 }} />

            <div className="grid grid-cols-5 gap-4 relative z-10">
              {WORKFLOW_STEPS.map(({ step, icon, title, body }) => {
                const isHov = hoveredStep === step;
                return (
                  <div
                    key={step}
                    tabIndex={0}
                    onMouseEnter={() => setHoveredStep(step)}
                    onMouseLeave={() => setHoveredStep(null)}
                    onFocus={() => setHoveredStep(step)}
                    onBlur={() => setHoveredStep(null)}
                    className={`p-5 rounded-2xl border cursor-default transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      isHov ? "-translate-y-2" : ""
                    }`}
                    style={{
                      background: isHov ? "var(--bg-surface)" : "var(--bg-base)",
                      borderColor: isHov ? "var(--accent)" : "var(--border)",
                      boxShadow: isHov ? "var(--shadow-md)" : "none",
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg mb-5 transition-all duration-200"
                      style={{
                        background: isHov
                          ? "var(--accent)"
                          : isDark ? "#1e2d3f" : "#e8f0f3",
                        color: isHov ? "white" : "var(--text-muted)",
                        boxShadow: isHov ? "0 4px 12px rgba(31,107,123,0.3)" : "none",
                      }}
                    >
                      {icon}
                    </div>
                    <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${accent}`}>
                      Step 0{step}
                    </div>
                    <h3 className={`font-bold text-sm leading-snug mb-2 ${textPrimary}`}>{title}</h3>
                    <p className={`text-xs leading-relaxed ${textMuted}`}>{body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile vertical timeline */}
          <div className="lg:hidden pl-6 relative">
            <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: "var(--accent)", opacity: 0.3 }} />
            <div className="space-y-4">
              {WORKFLOW_STEPS.map(({ step, icon, title, body }) => (
                <div key={step} className={`relative p-5 rounded-2xl border ${surface}`}>
                  <div className="absolute -left-[35px] top-4 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--bg-surface)", border: `2px solid var(--accent)`, color: "var(--accent)" }}>
                    {step}
                  </div>
                  <h3 className={`font-bold text-sm ${textPrimary}`}>{icon} {title}</h3>
                  <p className={`text-xs mt-1.5 leading-relaxed ${textMuted}`}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Matching Engine ───────────────────────────────────────────────── */}
      <section id="dispatch" className="py-24 max-w-7xl mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-6 space-y-5">
            <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>Transparent Logic</span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold leading-tight ${textPrimary}`}>
              Assignments you can audit and trust
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
              Eligibility and candidate scoring come from transparent operational rules — never an opaque algorithm.
              A human dispatcher always reviews the job and confirms the assignment.
            </p>

            <div className="space-y-3 pt-1">
              {[
                { n: 1, color: "#1E824C", title: "Strict Hard Filtering First",
                  body: "Expired licences, active leave, and schedule double-bookings are removed before any scoring." },
                { n: 2, color: "var(--accent)", title: "Transparent Multi-Factor Scoring",
                  body: "Trade qualifications, travel proximity, and workload are computed with plain weighted arithmetic." },
                { n: 3, color: "#7c3aed", title: "Human Dispatcher Authorization",
                  body: "No automated assignments. An experienced dispatcher reviews the list and confirms the dispatch." },
              ].map(({ n, color, title, body }) => (
                <div key={n} className={`flex items-start gap-4 p-4 rounded-xl border ${surface}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 text-white"
                    style={{ background: color }}>
                    {n}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${textPrimary}`}>{title}</h4>
                    <p className={`text-xs mt-1 leading-relaxed ${textMuted}`}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className={`p-6 rounded-2xl border shadow-[var(--shadow-md)] space-y-4 ${surface}`}>
              <div className={`flex items-center justify-between pb-4 border-b ${borderColor}`}>
                <div>
                  <h3 className={`font-bold text-base ${textPrimary}`}>Candidate Evaluation</h3>
                  <span className={`text-xs ${textMuted}`}>Match breakdown — WO #3088 (CCTV & Security)</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold`}
                  style={{ background: "var(--bg-surface-2)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                  CCTV & Access
                </span>
              </div>

              {/* Top match */}
              <div className={`p-4 rounded-xl border-2 space-y-2`} style={{ borderColor: "var(--accent)", background: "var(--bg-surface-2)" }}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${textPrimary}`}>Tanvir Hasan</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    91% Match
                  </span>
                </div>
                <p className={`text-xs ${textSecondary}`}>Certified CCTV & NVR Specialist · Tejgaon · 0 active jobs</p>
                <div className={`flex gap-3 text-[11px] font-medium text-emerald-600 dark:text-emerald-400`}>
                  <span>✓ Safety Cert</span><span>✓ Free Now</span><span>✓ 2.1 km</span>
                </div>
              </div>

              {/* 2nd match */}
              <div className={`p-4 rounded-xl border ${surface2}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${textSecondary}`}>Mehedi Zaman</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    78% Match
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Security Tech · 1 active job in Banani</p>
              </div>

              {/* Ineligible */}
              <div className={`p-4 rounded-xl border opacity-60 ${surface2}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${textMuted}`}>Nayeem Islam</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    Ineligible
                  </span>
                </div>
                <p className="text-xs text-red-500 mt-1">✕ Certification expired 12 days ago (filtered)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role Workspaces ───────────────────────────────────────────────── */}
      <section className={`py-20 border-t ${borderColor}`} style={{ background: "var(--bg-surface-2)" }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>Role Workspaces</span>
            <h2 className={`text-3xl font-extrabold ${textPrimary}`}>Tailored tools for every stakeholder</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "🏢", title: "Business Customer", body: "Submit problems, monitor arrival countdowns, review equipment history, and approve digital invoices." },
              { icon: "📡", title: "Dispatcher Console", body: "Review incoming requests, compare candidates with transparent scores, enforce SLAs, and confirm assignments." },
              { icon: "🧰", title: "Field Technician", body: "Access today's job roster, update travel and on-site progress, manage certifications, and report completion." },
              { icon: "⚙️", title: "Administrator", body: "Oversee workforce accounts, review audit trails, monitor SLA breach reports, and configure service boundaries." },
            ].map(({ icon, title, body }) => (
              <div key={title} className={`p-6 rounded-2xl border hover:-translate-y-1 transition-all duration-200 ${surface}`}>
                <span className="text-2xl block mb-3">{icon}</span>
                <h3 className={`font-bold text-base mb-2 ${textPrimary}`}>{title}</h3>
                <p className={`text-xs leading-relaxed ${textMuted}`}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SUBSCRIPTION PLANS ──────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="packages" className="py-24 max-w-7xl mx-auto px-5">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-6">
          <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>Coverage Plans</span>
          <h2 className={`text-3xl sm:text-4xl font-extrabold ${textPrimary}`}>Choose your facility coverage</h2>
          <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
            All plans include qualified coordination across all five service trades.
          </p>
        </div>

        {/* SLA clarification */}
        <div className={`max-w-3xl mx-auto mb-12 p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3`}
          style={{ background: isDark ? "rgba(56,189,248,0.05)" : "rgba(31,107,123,0.05)", borderColor: "var(--accent)", color: "var(--text-secondary)" }}>
          <span className="text-lg shrink-0">⏱️</span>
          <div>
            <strong className={textPrimary}>What does "arrival SLA" mean?</strong>{" "}
            The assigned technician physically arrives at your facility within the stated window — not merely an email acknowledgement or ticket update. Total repair duration depends on job scope and parts required.
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">

          {/* Plan A: 8-Hour Daily */}
          <div className={`p-7 rounded-2xl border flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all ${surface}`}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold ${textPrimary}`}>8-Hour Daily</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${borderColor} ${textMuted}`}>
                    Plan A
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Defined daily operational window</p>
              </div>
              <div className="py-4 border-y" style={{ borderColor: "var(--border)" }}>
                <div className={`text-lg font-extrabold ${textPrimary}`}>Pricing to be announced</div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>8 hours per day coverage</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                <span className={`text-xs font-medium block ${textMuted}`}>Coverage window:</span>
                <span className={`text-base font-bold ${textPrimary}`}>8 hours per day</span>
              </div>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                For businesses that need qualified professionals during a defined daily operating window. Contact us for schedule details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePlan("8hr")}
              className={`mt-6 w-full py-3 rounded-xl font-semibold text-sm border transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] ${borderColor} ${textSecondary}`}
            >
              Select Plan A
            </button>
          </div>

          {/* Plan B: 24/7 Standard */}
          <div className={`p-7 rounded-2xl border flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all ${surface}`}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold ${textPrimary}`}>24/7 Standard</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Plan B
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Round-the-clock reliable coverage</p>
              </div>
              <div className="py-4 border-y" style={{ borderColor: "var(--border)" }}>
                <div className={`text-lg font-extrabold ${textPrimary}`}>Pricing to be announced</div>
                <div className={`text-xs mt-0.5 font-medium`} style={{ color: "#1E824C" }}>
                  ★ Available 24 hours · 7 days a week
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                <span className={`text-xs font-medium block ${textMuted}`}>Arrival SLA commitment:</span>
                <span className="text-base font-bold" style={{ color: "#1E824C" }}>Within 40 minutes on site</span>
              </div>
              <ul className="space-y-2 text-xs">
                {["All 5 service trades covered", "Human dispatcher verification every job", "Digital job history & itemised invoices"].map((b) => (
                  <li key={b} className={`flex items-center gap-2 ${textSecondary}`}>
                    <CheckIcon className="w-3.5 h-3.5" style={{ color: "#1E824C" }} />{b}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handlePlan("247-standard")}
              className={`mt-6 w-full py-3 rounded-xl font-semibold text-sm border transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] ${borderColor} ${textSecondary}`}
            >
              Select Plan B
            </button>
          </div>

          {/* Plan C: 24/7 Priority — FEATURED */}
          <div
            className="p-7 rounded-2xl flex flex-col justify-between relative transition-all hover:-translate-y-1"
            style={{ background: isDark ? "linear-gradient(160deg,#0f1e30 0%,#0a1a28 100%)" : "linear-gradient(160deg,#e8f4f7 0%,#d8eef3 100%)", border: "2px solid var(--accent)", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow"
              style={{ background: "var(--accent)" }}>
              ⚡ Fastest Response
            </div>
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold ${textPrimary}`}>24/7 Priority</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: isDark ? "rgba(56,189,248,0.15)" : "rgba(31,107,123,0.12)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                    Plan C
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>For time-critical facilities</p>
              </div>
              <div className="py-4 border-y" style={{ borderColor: "var(--accent)", opacity: 0.3 }}>
              </div>
              <div className="py-0">
                <div className={`text-lg font-extrabold ${textPrimary}`}>Pricing to be announced</div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>24/7 · 2× faster arrival SLA</div>
              </div>
              <div className="p-3.5 rounded-xl" style={{ background: isDark ? "rgba(56,189,248,0.08)" : "rgba(31,107,123,0.08)", border: "1px solid var(--accent)" }}>
                <span className="text-xs font-medium block" style={{ color: "var(--accent)" }}>Arrival SLA commitment:</span>
                <span className={`text-xl font-extrabold ${textPrimary}`}>Within 20 minutes on site</span>
              </div>
              <ul className="space-y-2 text-xs">
                {["20-min rapid arrival (2× faster)", "Top-tier emergency dispatcher priority", "Full asset service history & preventative alerts"].map((b, i) => (
                  <li key={b} className={`flex items-center gap-2 ${i === 0 ? `font-semibold ${textPrimary}` : textSecondary}`}>
                    <CheckIcon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />{b}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handlePlan("247-priority")}
              className="mt-6 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
              style={{ background: "var(--accent)" }}
            >
              Select Plan C
            </button>
          </div>

          {/* Plan D: Custom Coverage */}
          <div className={`p-7 rounded-2xl border flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all`}
            style={{ background: isDark ? "linear-gradient(135deg,#0f1a27 0%,#12203a 100%)" : "linear-gradient(135deg,#fafafa 0%,#f4f0eb 100%)", borderColor: "var(--border)" }}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold ${textPrimary}`}>Custom Coverage</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${borderColor} ${textMuted}`}>
                    Plan D
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Tailored to your requirements</p>
              </div>
              <div className="py-4 border-y" style={{ borderColor: "var(--border)" }}>
                <div className={`text-lg font-extrabold ${textPrimary}`}>Pricing upon review</div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>Discussed after requirements review</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <span className={`text-xs font-medium block ${textMuted}`}>Example schedules:</span>
                <span className={`text-sm font-bold ${textPrimary}`}>6, 8, or 16 hours/day</span>
              </div>
              <p className={`text-xs leading-relaxed ${textSecondary}`}>
                Request a tailored daily coverage schedule that matches your operating hours. Arrival SLAs and pricing are determined after we review your requirements.
              </p>
              <p className={`text-[11px] italic ${textMuted}`}>
                Not all custom schedules or SLAs are automatically available. Our team will confirm feasibility.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePlan("custom")}
              className={`mt-6 w-full py-3 rounded-xl font-semibold text-sm border-2 transition-colors hover:text-[var(--accent)] ${borderColor} ${textSecondary}`}
              style={{ borderColor: "var(--accent)" }}
            >
              Discuss a Custom Plan →
            </button>
          </div>
        </div>

        {/* Expandable comparison */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${borderColor} ${textSecondary} hover:text-[var(--accent)]`}
          >
            {showMatrix ? "Hide Plan Comparison ▲" : "Compare All Plans ▼"}
          </button>
        </div>

        {showMatrix && (
          <div className={`mt-6 rounded-2xl border overflow-hidden shadow-[var(--shadow-md)] ${surface}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                    <th className={`py-4 px-5 font-semibold ${textSecondary}`}>Feature</th>
                    <th className={`py-4 px-5 font-semibold ${textSecondary}`}>Plan A · 8-Hour</th>
                    <th className={`py-4 px-5 font-semibold ${textSecondary}`}>Plan B · 24/7 Std</th>
                    <th className={`py-4 px-5 font-bold`} style={{ color: "var(--accent)" }}>Plan C · 24/7 Priority</th>
                    <th className={`py-4 px-5 font-semibold ${textSecondary}`}>Plan D · Custom</th>
                  </tr>
                </thead>
                <tbody style={{ borderColor: "var(--border)" }} className="divide-y divide-[var(--border)]">
                  {[
                    ["Coverage Window", "8 hours / day", "24/7", "24/7", "Tailored schedule"],
                    ["Arrival SLA", "Not specified", "40 minutes", "20 minutes (2×)", "To be confirmed"],
                    ["Service Trades", "All 5", "All 5", "All 5", "All 5"],
                    ["Dispatcher Type", "Human dispatcher", "Human dispatcher", "Emergency priority", "Human dispatcher"],
                    ["Pricing", "To be announced", "To be announced", "To be announced", "Upon review"],
                  ].map(([feat, a, b, c, d]) => (
                    <tr key={feat as string}>
                      <td className={`py-3 px-5 font-medium ${textPrimary}`}>{feat}</td>
                      <td className={`py-3 px-5 ${textMuted}`}>{a}</td>
                      <td className={`py-3 px-5 ${textMuted}`}>{b}</td>
                      <td className={`py-3 px-5 font-semibold`} style={{ color: "var(--accent)" }}>{c}</td>
                      <td className={`py-3 px-5 ${textMuted}`}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <section id="about" className={`py-24 border-t ${borderColor}`} style={{ background: "var(--bg-surface-2)" }}>
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>About VoltOps</span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold leading-tight ${textPrimary}`}>
              Built for commercial field service coordination
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
              Most businesses still handle facility breakdowns through scattered phone books, chat groups, and unverified contractors.
              When a commercial chiller stalls, a security camera drops, or a generator falters, delays cost operational revenue.
            </p>
            <p className={`text-sm leading-relaxed ${textMuted}`}>
              VoltOps replaces guesswork with an accountable coordination infrastructure — connecting business managers with vetted
              technicians across electrical, mechanical, security, IT, and facility upkeep, backed by physical arrival commitments and
              human dispatcher accountability.
            </p>
          </div>
          <div className="lg:col-span-5 space-y-4">
            {[
              { title: "No uncertified technicians", body: "Safety credentials and trade licences are verified before assignment eligibility." },
              { title: "No double bookings", body: "Active job workloads and transit distances prevent technician overcommitment." },
              { title: "Real operational accountability", body: "Customers monitor verified technician transit and itemised billing records." },
            ].map(({ title, body }) => (
              <div key={title} className={`p-5 rounded-xl border space-y-1 ${surface}`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${textPrimary}`}>
                  <span style={{ color: "#1E824C" }}>✓</span> {title}
                </div>
                <p className={`text-xs ${textMuted}`}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 max-w-7xl mx-auto px-5">
        {/* CTA banner */}
        <div className="p-8 sm:p-12 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-[var(--shadow-md)] mb-16"
          style={{ background: isDark ? "linear-gradient(135deg,#0f1e30 0%,#0a2233 100%)" : "linear-gradient(135deg,#e8f4f7 0%,#d4edf4 100%)", border: "1px solid var(--accent)" }}>
          <div className="space-y-2 text-center md:text-left">
            <h2 className={`text-2xl sm:text-3xl font-extrabold ${textPrimary}`}>
              Ready to safeguard your facility operations?
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              Select a coverage plan or discuss a custom schedule with our team.
            </p>
          </div>
          <a
            href="#packages"
            className="px-6 py-3.5 rounded-xl text-sm font-bold text-white shrink-0 shadow-md hover:opacity-90 transition-all"
            style={{ background: "var(--accent)" }}
          >
            View Plans
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact info */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>Direct Inquiries</span>
              <h2 className={`text-2xl sm:text-3xl font-bold mt-1 ${textPrimary}`}>Talk with our team</h2>
              <p className={`text-sm mt-2 ${textMuted}`}>
                Enterprise facility questions or multiple sites? Send our coordination team a message.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: "✉️", label: "Email", value: "support@voltops.example" },
                { icon: "📞", label: "Phone", value: "+880 1XXX-XXXXXX" },
                { icon: "📍", label: "Coordination Center", value: "Dhaka, Bangladesh" },
              ].map(({ icon, label, value }) => (
                <div key={label} className={`flex items-center gap-3 p-3.5 rounded-xl border ${surface}`}>
                  <span className="text-lg">{icon}</span>
                  <div>
                    <span className={`text-xs font-semibold block ${textMuted}`}>{label}</span>
                    <span className={`text-sm ${textSecondary}`}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-7">
            <div className={`p-7 rounded-2xl border shadow-[var(--shadow-sm)] ${surface}`}>
              <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Send an inquiry</h3>
              <p className={`text-xs mb-5 ${textMuted}`}>
                This form is for sales and facility inquiries only. For emergency repairs, please subscribe and log in to dispatch.
              </p>
              {contactDone ? (
                <div className="p-4 rounded-xl text-sm border" style={{ background: "rgba(30,130,76,0.08)", borderColor: "#1E824C", color: "#1E824C" }}>
                  ✓ Thank you! Your inquiry has been noted. Our team will reply within one working day.
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Your Name</label>
                      <input type="text" required value={cName} onChange={(e) => setCName(e.target.value)}
                        placeholder="Karim Rahman"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2`}
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Business Email</label>
                      <input type="email" required value={cEmail} onChange={(e) => setCEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2`}
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Company / Facility Name</label>
                    <input type="text" value={cCompany} onChange={(e) => setCCompany(e.target.value)}
                      placeholder="Apex Galleria Ltd."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2`}
                      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Message</label>
                    <textarea rows={4} required value={cMsg} onChange={(e) => setCMsg(e.target.value)}
                      placeholder="Tell us about your facility locations and coverage requirements..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 resize-none`}
                      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <button type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "var(--accent)" }}>
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className={`border-t py-8 ${borderColor}`} style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className={`text-xs font-semibold ${textSecondary}`}>
              © 2026 VoltOps · Subscription-based field service coordination
            </span>
          </div>
          <div className={`text-xs ${textMuted}`}>CSE 400 project, BUBT</div>
        </div>
      </footer>
    </div>
  );
}
