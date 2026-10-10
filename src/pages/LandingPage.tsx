import { useState, useEffect, FormEvent, CSSProperties, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme, ThemePreference } from "../context/ThemeContext";
import {
  IconProps,
  ZapIcon,
  SnowflakeIcon,
  ShieldCheckIcon,
  ServerIcon,
  WrenchIcon,
  ClockIcon,
  CheckCircleIcon,
  MapPinIcon,
  UserCheckIcon,
  ArrowRightIcon,
  BuildingIcon,
  CompassIcon,
  FileTextIcon,
  AlertTriangleIcon,
  SlidersIcon,
  RadioIcon,
  SunIcon,
  MoonIcon,
  LaptopIcon,
  MailIcon,
  PhoneIcon,
  SettingsIcon,
} from "../components/Icons";

// ── Coverage Plan IDs ────────────────────────────────────────────────────
export type PlanId = "8hr" | "247-standard" | "247-priority" | "custom";

// ── 5-Category Simulation Scenarios ─────────────────────────────────────
interface Scenario {
  id: string;
  categoryLabel: string;
  icon: FC<IconProps>;
  accentColor: string;
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
    icon: SnowflakeIcon,
    accentColor: "#0891b2",
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
    icon: ZapIcon,
    accentColor: "#d97706",
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
    icon: ShieldCheckIcon,
    accentColor: "#7c3aed",
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
    icon: ServerIcon,
    accentColor: "#059669",
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
    icon: WrenchIcon,
    accentColor: "#e11d48",
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
  { step: 1, icon: FileTextIcon, title: "Subscribe", body: "Choose a coverage plan with a defined operational window and arrival SLA for your facilities." },
  { step: 2, icon: AlertTriangleIcon, title: "Report the issue", body: "Select the trade category and submit your breakdown request from any browser or device." },
  { step: 3, icon: CompassIcon, title: "Dispatcher reviews", body: "Our operations desk evaluates verified certifications, travel distance, and current workload." },
  { step: 4, icon: ZapIcon, title: "Technician arrives", body: "Your qualified professional reaches your premises within the committed physical arrival window." },
  { step: 5, icon: CheckCircleIcon, title: "Sign-off & records", body: "Approve completed work, receive a digital sign-off, and access itemised equipment history." },
];

// ── Theme Selector Component ─────────────────────────────────────────────
function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: FC<IconProps> }[] = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: LaptopIcon },
  ];

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] p-0.5"
    >
      {options.map((o) => {
        const Icon = o.icon;
        const isActive = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.label}
            aria-pressed={isActive}
            onClick={() => setPreference(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isActive
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={13} className="shrink-0" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Logo Mark ────────────────────────────────────────────────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#176577] to-[#0d424e] shadow-md group-hover:shadow-[0_0_16px_rgba(56,189,248,0.4)] transition-all duration-300"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <ZapIcon size={Math.round(size * 0.52)} className="text-[#38bdf8] group-hover:rotate-6 transition-transform duration-300" />
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
  const ActiveIcon = scenario.icon;

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
    <div className="min-h-screen font-sans selection:bg-[var(--accent)] selection:text-white" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 border-b ${borderColor} transition-all duration-300 ${
          scrolled ? "backdrop-blur-xl shadow-[var(--shadow-sm)]" : ""
        }`}
        style={{ background: scrolled ? "var(--bg-overlay)" : "var(--bg-base)" }}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo + Brand */}
          <a href="#" className="flex items-center gap-3 group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg">
            <LogoMark size={36} />
            <div className="flex flex-col leading-none">
              <span className={`font-heading font-extrabold text-[18px] tracking-tight ${textPrimary}`}>VoltOps</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${accent}`}>
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
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${borderColor} ${textSecondary} hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all`}
            >
              Sign in
            </Link>
            <a
              href="#packages"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              <span>Choose Plan</span>
              <ArrowRightIcon size={14} />
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
      <header className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Ambient radial glows with slow drifting animation */}
        <div className="hero-glow-blob-1 absolute top-10 left-1/4 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full blur-[130px] pointer-events-none animate-ambient-drift" />
        <div className="hero-glow-blob-2 absolute top-1/3 right-10 w-[30rem] h-[30rem] rounded-full blur-[110px] pointer-events-none animate-ambient-drift-rev" />
        <div className="hero-glow-blob-3 absolute -bottom-10 left-1/3 w-[26rem] h-[26rem] rounded-full blur-[100px] pointer-events-none animate-pulse-subtle" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: "radial-gradient(var(--text-muted) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 20%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 20%, transparent 80%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">

            {/* Left — Hero Copy */}
            <div className="lg:col-span-6 space-y-7 text-left">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[var(--text-secondary)] font-medium">
                  Unified Multi-Trade Facility Coverage · 24/7 Operations
                </span>
              </div>

              {/* Expressive Headline */}
              <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-[54px] tracking-tight leading-[1.12] text-[var(--text-primary)]">
                One unified service plan.{" "}
                <span className="bg-gradient-to-r from-[var(--accent)] via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                  The right technician on site.
                </span>{" "}
                Before downtime costs you.
              </h1>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg leading-relaxed text-[var(--text-secondary)] max-w-xl">
                VoltOps coordinates vetted, licensed professionals across electrical, HVAC, security, IT,
                and facility upkeep — backed by guaranteed coverage windows, physical arrival SLAs,
                and human dispatcher oversight.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <a
                  href="#packages"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-95 active:scale-[0.98]"
                  style={{ background: "var(--accent)" }}
                >
                  <span>Explore Coverage Plans</span>
                  <ArrowRightIcon size={16} />
                </a>
                <a
                  href="#how"
                  className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border ${borderColor} ${textSecondary} hover:text-[var(--accent)] hover:border-[var(--accent)] bg-[var(--bg-surface)] transition-all`}
                >
                  <CompassIcon size={16} className="text-[var(--accent)]" />
                  <span>See How It Works</span>
                </a>
              </div>

              {/* Micro Trust Strip */}
              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)] font-medium">
                <span className="flex items-center gap-1.5">
                  <ClockIcon size={14} className="text-[var(--accent)]" />
                  20 & 40-Min Physical Arrival SLAs
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheckIcon size={14} className="text-emerald-500" />
                  100% Human Dispatcher Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheckIcon size={14} className="text-purple-500" />
                  5 Specialized Trades
                </span>
              </div>
            </div>

            {/* Right — Layered Console Composition */}
            <div className="lg:col-span-6 relative">
              {/* Floating Top-Right Indicator Pill */}
              <div
                className="hidden sm:flex absolute -top-4 -right-2 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] animate-float-gentle text-xs font-semibold text-[var(--text-primary)]"
                style={{ backdropFilter: "blur(12px)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <UserCheckIcon size={15} className="text-emerald-500" />
                <span>Verified Match En Route · ~7 mins</span>
              </div>

              {/* Primary Dispatch Console */}
              <div
                className="rounded-2xl border p-5 sm:p-6 transition-all relative z-10 glass-panel"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {/* Console header */}
                <div className={`flex items-center justify-between pb-4 mb-3 border-b ${borderColor}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-wider pl-1.5 border-l border-[var(--border)] ${textMuted}`}>
                      DISPATCH CONSOLE v2.6
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Simulation</span>
                  </div>
                </div>

                {/* Trade Category Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-[var(--border)] no-scrollbar">
                  {SCENARIOS.map((s) => {
                    const isActive = s.id === activeId;
                    const SvgIcon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                          isActive
                            ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-surface-2)] shadow-sm"
                            : `border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]`
                        }`}
                      >
                        <SvgIcon size={14} className={isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                        <span>{s.categoryLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Work Order Body */}
                <div className="space-y-3.5">
                  {/* Job Header Card */}
                  <div
                    className="p-3.5 rounded-xl border border-[var(--border)]"
                    style={{ background: "var(--bg-surface-2)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ActiveIcon size={15} style={{ color: scenario.accentColor }} />
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: scenario.accentColor }}>
                            {scenario.categoryLabel}
                          </span>
                        </div>
                        <h3 className={`text-sm font-bold leading-snug ${textPrimary}`}>{scenario.title}</h3>
                        <p className={`text-xs mt-1 ${textMuted}`}>{scenario.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                          {scenario.urgency}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold mt-1.5" style={{ color: "var(--accent)" }}>
                          <ClockIcon size={12} />
                          <span>ETA {fmt(times[scenario.id] ?? 0)}</span>
                        </div>
                        <span className={`text-[10px] block ${textMuted}`}>{scenario.slaText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Technician Match Card */}
                  <div
                    className="p-3.5 rounded-xl border-2 space-y-2.5"
                    style={{ borderColor: "var(--accent)", background: "var(--bg-surface-2)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent)] text-white shadow-sm">
                          <UserCheckIcon size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${textPrimary}`}>{scenario.tech.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                              {scenario.tech.matchScore}% Match
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${textSecondary}`}>
                            {scenario.tech.role} · {scenario.tech.distanceText}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed border-t border-[var(--border)] pt-2 text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-secondary)]">Dispatcher evaluation:</span>{" "}
                      {scenario.tech.note}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {scenario.tech.checks.map((c, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <CheckCircleIcon size={12} className="shrink-0" />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Simulated Job Pipeline */}
                  <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: "var(--bg-surface-2)" }}>
                    <div className="flex justify-between items-center text-[11px] mb-2 text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-secondary)]">Simulated job status:</span>
                      <span className="font-bold text-[var(--accent)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                        En Route to Premises
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                      {["Reported", "Reviewed", "Assigned", "En Route", "On Site"].map((label, i) => (
                        <div
                          key={i}
                          className={`py-1 rounded font-medium transition-colors ${
                            i < 3
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold"
                              : i === 3
                              ? "bg-[var(--accent)] text-white font-bold shadow-sm"
                              : "text-[var(--text-muted)] border border-[var(--border)] bg-[var(--bg-surface)]"
                          }`}
                        >
                          {i + 1}. {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-center italic text-[var(--text-muted)]">
                    Human dispatchers confirm all assignments prior to physical field technician deployment.
                  </p>
                </div>
              </div>

              {/* Floating Bottom-Left Assurance Pill */}
              <div
                className="hidden sm:flex absolute -bottom-4 -left-3 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] text-xs font-semibold text-[var(--text-primary)]"
                style={{ backdropFilter: "blur(12px)" }}
              >
                <ShieldCheckIcon size={16} className="text-[var(--accent)]" />
                <span>Physical Arrival SLA · Enforced</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── Metrics Bar ─────────────────────────────────────────────────── */}
      <section className={`border-y ${borderColor} py-10`} style={{ background: "var(--bg-surface-2)" }}>
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
          {[
            { val: "20 & 40 min", desc: "Physical technician arrival commitments", border: "var(--accent)" },
            { val: "5 Trades", desc: "HVAC, Electrical, Security, IT & Facilities", border: "#14b8a6" },
            { val: "100% Human", desc: "Dispatcher-confirmed assignments always", border: "#1E824C" },
            { val: "4 Plans", desc: "From 8-hr daily to custom coverage schedules", border: "#9333ea" },
          ].map(({ val, desc, border }) => (
            <div key={val} className="pl-4" style={{ borderLeft: `2.5px solid ${border}` }}>
              <div className={`text-2xl sm:text-3xl font-extrabold font-heading ${textPrimary}`}>{val}</div>
              <p className={`text-xs sm:text-sm mt-1 leading-snug ${textMuted}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services Section ─────────────────────────────────────────────── */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--accent)]">
            <WrenchIcon size={13} />
            <span>Unified Trade Coverage</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold font-heading ${textPrimary}`}>
            One subscription for every facility trade
          </h2>
          <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
            VoltOps coordinates vetted, licensed professionals across five core operational trades under a single unified coordination platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: ZapIcon,
              accent: "#d97706",
              label: "High & Low Voltage",
              title: "Electrical & Power Systems",
              desc: "Industrial generators, step-down transformers, commercial switchboards, UPS backups, and severe line faults.",
              bullets: ["Generator synchronization & AVR testing", "Phase imbalance & emergency restoration", "Transformer insulation inspection"],
            },
            {
              icon: SnowflakeIcon,
              accent: "#0891b2",
              label: "Climate & Ventilation",
              title: "Cooling & Mechanical HVAC",
              desc: "Commercial VRF/VRV units, rooftop chillers, ducted split systems, compressor failures, and refrigerant diagnostics.",
              bullets: ["Chiller & compressor breakdown triage", "VRF refrigerant recharge & vacuuming", "Scheduled air quality & filter cycles"],
            },
            {
              icon: ShieldCheckIcon,
              accent: "#7c3aed",
              label: "Perimeter & Access",
              title: "Security & Surveillance",
              desc: "IP CCTV cameras, DVR/NVR storage, biometric turnstiles, and electronic door strike malfunctions.",
              bullets: ["Camera feed restoration & lens alignment", "DVR/NVR raid reconfiguration", "Access control reader repairs"],
            },
            {
              icon: ServerIcon,
              accent: "#059669",
              label: "Hardware & Systems",
              title: "IT, Hardware & Networks",
              desc: "Office networking drops, rack cabling, core router crashes, POS downtime, and workstation hardware triage.",
              bullets: ["Managed switch & firewall diagnosis", "Server rack cable management", "POS terminal hardware replacement"],
            },
            {
              icon: WrenchIcon,
              accent: "#e11d48",
              label: "Building Infrastructure",
              title: "Facility & Building Upkeep",
              desc: "Commercial repairs, door sensors, lighting fixture overhaul, and structural facility upkeep across business premises.",
              bullets: ["Partition wall & moisture barrier repair", "Commercial door alignment & sensors", "Lighting fixture resets & overhaul"],
            },
            {
              icon: RadioIcon,
              accent: "var(--accent)",
              label: "Human-in-the-Loop",
              title: "Dedicated Dispatch Control",
              desc: "Every work order is reviewed by an experienced human dispatcher who evaluates credentials, tools, and proximity.",
              bullets: ["Transparent multi-factor candidate scoring", "Live SLA countdown enforcement", "Itemized digital invoices & equipment logs"],
              featured: true,
            },
          ].map(({ icon: Icon, accent: ac, label, title, desc, bullets, featured }) => (
            <div
              key={title}
              className={`p-6 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
                featured ? "relative overflow-hidden" : card
              }`}
              style={{
                background: featured
                  ? isDark
                    ? "linear-gradient(135deg, #0b1a29 0%, #0e2436 100%)"
                    : "linear-gradient(135deg, #f0f8fa 0%, #e6f3f6 100%)"
                  : "var(--bg-surface)",
                borderColor: featured ? "var(--accent)" : "var(--border)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "var(--bg-surface-2)",
                  color: ac,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "var(--border)"}`,
                }}
              >
                <Icon size={20} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: ac }}>{label}</span>
              <h3 className={`text-base font-bold font-heading mt-1 mb-2 ${textPrimary}`}>{title}</h3>
              <p className={`text-xs leading-relaxed mb-4 ${textSecondary}`}>{desc}</p>
              <ul className="space-y-2 border-t border-[var(--border)] pt-3">
                {bullets.map((b) => (
                  <li key={b} className={`flex items-center gap-2 text-xs ${textSecondary}`}>
                    <CheckIcon className="w-3.5 h-3.5" style={{ color: ac }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how" className={`py-24 border-t ${borderColor} relative overflow-hidden`} style={{ background: "var(--bg-surface-2)" }}>
        <div className="max-w-7xl mx-auto px-5 relative">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--accent)]">
              <CompassIcon size={13} />
              <span>End-to-End Journey</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold font-heading ${textPrimary}`}>
              How VoltOps resolves facility issues
            </h2>
            <p className={`text-sm sm:text-base ${textSecondary}`}>
              A clear, accountable path from subscription to on-site sign-off.
            </p>
          </div>

          {/* Desktop connected path */}
          <div className="hidden lg:block relative">
            {/* Connecting line */}
            <div
              className="absolute top-10 left-12 right-12 h-[2px] pointer-events-none"
              style={{ background: "linear-gradient(to right, var(--accent), #14b8a6, #1E824C)", opacity: 0.35 }}
            />

            <div className="grid grid-cols-5 gap-4 relative z-10">
              {WORKFLOW_STEPS.map(({ step, icon: StepIcon, title, body }) => {
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
                      isHov ? "-translate-y-2 shadow-[var(--shadow-md)]" : ""
                    }`}
                    style={{
                      background: isHov ? "var(--bg-surface)" : "var(--bg-base)",
                      borderColor: isHov ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-200"
                      style={{
                        background: isHov ? "var(--accent)" : isDark ? "#122030" : "#e4edf1",
                        color: isHov ? "white" : "var(--accent)",
                        boxShadow: isHov ? "0 4px 14px rgba(23,101,119,0.3)" : "none",
                      }}
                    >
                      <StepIcon size={20} />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
                      Step 0{step}
                    </div>
                    <h3 className={`font-bold font-heading text-sm leading-snug mb-2 ${textPrimary}`}>{title}</h3>
                    <p className={`text-xs leading-relaxed ${textMuted}`}>{body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile vertical timeline */}
          <div className="lg:hidden pl-6 relative">
            <div className="absolute left-3 top-0 bottom-0 w-[2px]" style={{ background: "var(--accent)", opacity: 0.3 }} />
            <div className="space-y-4">
              {WORKFLOW_STEPS.map(({ step, icon: StepIcon, title, body }) => (
                <div key={step} className={`relative p-5 rounded-2xl border ${surface}`}>
                  <div
                    className="absolute -left-[37px] top-4 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--bg-surface)", border: "2px solid var(--accent)", color: "var(--accent)" }}
                  >
                    {step}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <StepIcon size={16} className="text-[var(--accent)]" />
                    <h3 className={`font-bold font-heading text-sm ${textPrimary}`}>{title}</h3>
                  </div>
                  <p className={`text-xs leading-relaxed ${textMuted}`}>{body}</p>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--accent)]">
              <SlidersIcon size={13} />
              <span>Transparent Logic</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold font-heading leading-tight ${textPrimary}`}>
              Assignments you can audit and trust
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
              Eligibility and candidate scoring come from transparent operational rules — never an opaque algorithm.
              A human dispatcher always reviews the job and confirms the assignment.
            </p>

            <div className="space-y-3 pt-2">
              {[
                {
                  n: 1,
                  icon: ShieldCheckIcon,
                  color: "#1E824C",
                  title: "Strict Hard Filtering First",
                  body: "Expired licences, active leave, and schedule double-bookings are removed before any scoring.",
                },
                {
                  n: 2,
                  icon: SlidersIcon,
                  color: "var(--accent)",
                  title: "Transparent Multi-Factor Scoring",
                  body: "Trade qualifications, travel proximity, and workload are computed with plain weighted arithmetic.",
                },
                {
                  n: 3,
                  icon: RadioIcon,
                  color: "#7c3aed",
                  title: "Human Dispatcher Authorization",
                  body: "No automated assignments. An experienced dispatcher reviews the list and confirms the dispatch.",
                },
              ].map(({ n, icon: Icon, color, title, body }) => (
                <div key={n} className={`flex items-start gap-4 p-4 rounded-xl border ${surface}`}>
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm"
                    style={{ background: color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className={`font-bold font-heading text-sm ${textPrimary}`}>{title}</h4>
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
                  <h3 className={`font-bold font-heading text-base ${textPrimary}`}>Candidate Evaluation</h3>
                  <span className={`text-xs ${textMuted}`}>Match breakdown — WO #3088 (CCTV & Security)</span>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "var(--bg-surface-2)", color: "var(--accent)", border: "1px solid var(--border)" }}
                >
                  CCTV & Access
                </span>
              </div>

              {/* Top match */}
              <div className="p-4 rounded-xl border-2 space-y-2" style={{ borderColor: "var(--accent)", background: "var(--bg-surface-2)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className={`font-bold text-sm ${textPrimary}`}>Tanvir Hasan</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    91% Match
                  </span>
                </div>
                <p className={`text-xs ${textSecondary}`}>Certified CCTV & NVR Specialist · Tejgaon · 0 active jobs</p>
                <div className="flex gap-3 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1"><CheckCircleIcon size={12} /> Safety Cert</span>
                  <span className="flex items-center gap-1"><CheckCircleIcon size={12} /> Free Now</span>
                  <span className="flex items-center gap-1"><CheckCircleIcon size={12} /> 2.1 km away</span>
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
                <p className={`text-xs mt-1 ${textMuted}`}>Security Tech · 1 active job in Banani (finishing in 35m)</p>
              </div>

              {/* Ineligible */}
              <div className={`p-4 rounded-xl border opacity-60 ${surface2}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${textMuted}`}>Nayeem Islam</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    Ineligible
                  </span>
                </div>
                <p className="text-xs text-red-500 mt-1">✕ Certification expired 12 days ago (filtered automatically)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role Workspaces ───────────────────────────────────────────────── */}
      <section className={`py-20 border-t ${borderColor}`} style={{ background: "var(--bg-surface-2)" }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--accent)]">
              <BuildingIcon size={13} />
              <span>Role Workspaces</span>
            </div>
            <h2 className={`text-3xl font-extrabold font-heading ${textPrimary}`}>Tailored tools for every stakeholder</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BuildingIcon, title: "Business Customer", body: "Submit problems, monitor arrival countdowns, review equipment history, and approve digital invoices." },
              { icon: RadioIcon, title: "Dispatcher Console", body: "Review incoming requests, compare candidates with transparent scores, enforce SLAs, and confirm assignments." },
              { icon: WrenchIcon, title: "Field Technician", body: "Access today's job roster, update travel and on-site progress, manage certifications, and report completion." },
              { icon: SettingsIcon, title: "Administrator", body: "Oversee workforce accounts, review audit trails, monitor SLA breach reports, and configure service boundaries." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className={`p-6 rounded-2xl border hover:-translate-y-1 transition-all duration-200 ${surface}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[var(--accent)] mb-4">
                  <Icon size={20} />
                </div>
                <h3 className={`font-bold font-heading text-base mb-2 ${textPrimary}`}>{title}</h3>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--accent)]">
            <ClockIcon size={13} />
            <span>Coverage Plans</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold font-heading ${textPrimary}`}>Choose your facility coverage</h2>
          <p className={`text-sm sm:text-base leading-relaxed ${textSecondary}`}>
            All plans include qualified coordination across all five service trades.
          </p>
        </div>

        {/* SLA clarification */}
        <div
          className="max-w-3xl mx-auto mb-12 p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3"
          style={{
            background: isDark ? "rgba(56,189,248,0.05)" : "rgba(23,101,119,0.05)",
            borderColor: "var(--accent)",
            color: "var(--text-secondary)",
          }}
        >
          <ClockIcon size={18} className="shrink-0 text-[var(--accent)] mt-0.5" />
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
                  <h3 className={`text-xl font-bold font-heading ${textPrimary}`}>8-Hour Daily</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${borderColor} ${textMuted}`}>
                    Plan A
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Defined daily operational window</p>
              </div>
              <div className="py-4 border-y border-[var(--border)]">
                <div className={`text-lg font-extrabold font-heading ${textPrimary}`}>Pricing to be announced</div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>8 hours per day coverage</div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
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
                  <h3 className={`text-xl font-bold font-heading ${textPrimary}`}>24/7 Standard</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Plan B
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Round-the-clock reliable coverage</p>
              </div>
              <div className="py-4 border-y border-[var(--border)]">
                <div className={`text-lg font-extrabold font-heading ${textPrimary}`}>Pricing to be announced</div>
                <div className="text-xs mt-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                  ★ Available 24 hours · 7 days a week
                </div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className={`text-xs font-medium block ${textMuted}`}>Arrival SLA commitment:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">Within 40 minutes on site</span>
              </div>
              <ul className="space-y-2 text-xs">
                {["All 5 service trades covered", "Human dispatcher verification every job", "Digital job history & itemised invoices"].map((b) => (
                  <li key={b} className={`flex items-center gap-2 ${textSecondary}`}>
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{b}
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
            style={{
              background: isDark
                ? "linear-gradient(160deg, #0b1a29 0%, #081622 100%)"
                : "linear-gradient(160deg, #eaf4f7 0%, #d8ecf2 100%)",
              border: "2px solid var(--accent)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1"
              style={{ background: "var(--accent)" }}
            >
              <ZapIcon size={12} />
              <span>Fastest Response</span>
            </div>
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold font-heading ${textPrimary}`}>24/7 Priority</h3>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                    style={{
                      background: isDark ? "rgba(56,189,248,0.15)" : "rgba(23,101,119,0.12)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                    }}
                  >
                    Plan C
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>For time-critical facilities</p>
              </div>
              <div className="py-4 border-y border-[var(--border)]">
                <div className={`text-lg font-extrabold font-heading ${textPrimary}`}>Pricing to be announced</div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>24/7 · 2× faster arrival SLA</div>
              </div>
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  background: isDark ? "rgba(56,189,248,0.08)" : "rgba(23,101,119,0.08)",
                  borderColor: "var(--accent)",
                }}
              >
                <span className="text-xs font-medium block" style={{ color: "var(--accent)" }}>Arrival SLA commitment:</span>
                <span className={`text-xl font-extrabold font-heading ${textPrimary}`}>Within 20 minutes on site</span>
              </div>
              <ul className="space-y-2 text-xs">
                {["20-min rapid arrival (2× faster)", "Top-tier emergency dispatcher priority", "Full asset service history & preventative alerts"].map((b, i) => (
                  <li key={b} className={`flex items-center gap-2 ${i === 0 ? `font-semibold ${textPrimary}` : textSecondary}`}>
                    <CheckIcon className="w-3.5 h-3.5 text-[var(--accent)]" />{b}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handlePlan("247-priority")}
              className="mt-6 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-95 active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5"
              style={{ background: "var(--accent)" }}
            >
              <span>Select Plan C</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>

          {/* Plan D: Custom Coverage */}
          <div
            className="p-7 rounded-2xl border flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all"
            style={{
              background: isDark ? "linear-gradient(135deg, #09131e 0%, #0d1a29 100%)" : "linear-gradient(135deg, #fcfbfa 0%, #f4f0eb 100%)",
              borderColor: "var(--border)",
            }}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-bold font-heading ${textPrimary}`}>Custom Coverage</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${borderColor} ${textMuted}`}>
                    Plan D
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Tailored to your requirements</p>
              </div>
              <div className="py-4 border-y border-[var(--border)]">
                <div className={`text-lg font-extrabold font-heading ${textPrimary}`}>Pricing upon review</div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>Discussed after requirements review</div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
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
              className={`mt-6 w-full py-3 rounded-xl font-semibold text-sm border-2 transition-colors hover:text-[var(--accent)] ${textSecondary}`}
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
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${borderColor} ${textSecondary} hover:text-[var(--accent)] bg-[var(--bg-surface)]`}
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
                    <th className="py-4 px-5 font-bold" style={{ color: "var(--accent)" }}>Plan C · 24/7 Priority</th>
                    <th className={`py-4 px-5 font-semibold ${textSecondary}`}>Plan D · Custom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {[
                    ["Coverage Window", "8 hours / day", "24/7", "24/7", "Tailored schedule"],
                    ["Arrival SLA", "Not specified", "40 minutes", "20 minutes (2×)", "To be confirmed"],
                    ["Service Trades", "All 5", "All 5", "All 5", "All 5"],
                    ["Dispatcher Type", "Human dispatcher", "Human dispatcher", "Emergency priority", "Human dispatcher"],
                    ["Pricing", "To be announced", "To be announced", "To be announced", "Upon review"],
                  ].map(([feat, a, b, c, d]) => (
                    <tr key={feat as string}>
                      <td className={`py-3.5 px-5 font-medium ${textPrimary}`}>{feat}</td>
                      <td className={`py-3.5 px-5 ${textMuted}`}>{a}</td>
                      <td className={`py-3.5 px-5 ${textMuted}`}>{b}</td>
                      <td className="py-3.5 px-5 font-semibold" style={{ color: "var(--accent)" }}>{c}</td>
                      <td className={`py-3.5 px-5 ${textMuted}`}>{d}</td>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--accent)]">
              <BuildingIcon size={13} />
              <span>About VoltOps</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold font-heading leading-tight ${textPrimary}`}>
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
                  <CheckCircleIcon size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{title}</span>
                </div>
                <p className={`text-xs pl-6 ${textMuted}`}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 max-w-7xl mx-auto px-5">
        {/* CTA banner */}
        <div
          className="p-8 sm:p-12 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-[var(--shadow-md)] mb-16"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #0b1a29 0%, #0e273a 100%)"
              : "linear-gradient(135deg, #e8f4f7 0%, #d4edf4 100%)",
            border: "1px solid var(--accent)",
          }}
        >
          <div className="space-y-2 text-center md:text-left">
            <h2 className={`text-2xl sm:text-3xl font-extrabold font-heading ${textPrimary}`}>
              Ready to safeguard your facility operations?
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              Select a coverage plan or discuss a custom schedule with our team.
            </p>
          </div>
          <a
            href="#packages"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white shrink-0 shadow-md hover:opacity-95 transition-all"
            style={{ background: "var(--accent)" }}
          >
            <span>View Plans</span>
            <ArrowRightIcon size={15} />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact info */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--accent)]">
                <MailIcon size={13} />
                <span>Direct Inquiries</span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-bold font-heading mt-2 ${textPrimary}`}>Talk with our team</h2>
              <p className={`text-sm mt-2 ${textMuted}`}>
                Enterprise facility questions or multiple sites? Send our coordination team a message.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: MailIcon, label: "Email", value: "support@voltops.example" },
                { icon: PhoneIcon, label: "Phone", value: "+880 1XXX-XXXXXX" },
                { icon: MapPinIcon, label: "Coordination Center", value: "Dhaka, Bangladesh" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className={`flex items-center gap-3.5 p-3.5 rounded-xl border ${surface}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--bg-surface-2)] text-[var(--accent)] shrink-0">
                    <Icon size={18} />
                  </div>
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
              <h3 className={`text-lg font-bold font-heading mb-1 ${textPrimary}`}>Send an inquiry</h3>
              <p className={`text-xs mb-5 ${textMuted}`}>
                This form is for sales and facility inquiries only. For emergency repairs, please subscribe and log in to dispatch.
              </p>
              {contactDone ? (
                <div className="p-4 rounded-xl text-sm border flex items-center gap-2" style={{ background: "rgba(30,130,76,0.08)", borderColor: "#1E824C", color: "#1E824C" }}>
                  <CheckCircleIcon size={18} />
                  <span>Thank you! Your inquiry has been noted. Our team will reply within one working day.</span>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Your Name</label>
                      <input
                        type="text"
                        required
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        placeholder="Karim Rahman"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Business Email</label>
                      <input
                        type="email"
                        required
                        value={cEmail}
                        onChange={(e) => setCEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Company / Facility Name</label>
                    <input
                      type="text"
                      value={cCompany}
                      onChange={(e) => setCCompany(e.target.value)}
                      placeholder="Apex Galleria Ltd."
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Message</label>
                    <textarea
                      rows={4}
                      required
                      value={cMsg}
                      onChange={(e) => setCMsg(e.target.value)}
                      placeholder="Tell us about your facility locations and coverage requirements..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-95 active:scale-[0.98]"
                    style={{ background: "var(--accent)" }}
                  >
                    <span>Send Message</span>
                    <ArrowRightIcon size={14} />
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
