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
  stage: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: "hvac",
    categoryLabel: "Commercial HVAC",
    icon: SnowflakeIcon,
    accentColor: "#38bdf8",
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
    accentColor: "#f59e0b",
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
    accentColor: "#a855f7",
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
    accentColor: "#10b981",
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
    accentColor: "#f43f5e",
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
      className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)] p-1 backdrop-blur-xl"
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
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isActive
                ? "bg-[#d4f43e] text-[#06090e] dark:bg-[#d4f43e] dark:text-[#06090e] shadow-sm font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={12} className="shrink-0" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Logo Mark ────────────────────────────────────────────────────────────
function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#d4f43e] to-[#a3e635] shadow-[0_0_16px_rgba(212,244,62,0.3)] transition-all duration-300"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <ZapIcon size={Math.round(size * 0.52)} className="text-[#06090e]" />
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

  // Shared classes
  const surface = "glass-panel";
  const textPrimary = "text-[var(--text-primary)]";
  const textSecondary = "text-[var(--text-secondary)]";
  const textMuted = "text-[var(--text-muted)]";
  const borderColor = "border-[var(--border)]";

  return (
    <div
      className="min-h-screen font-sans selection:bg-[#d4f43e] selection:text-[#06090e]"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >

      {/* ── Floating Pill Navigation ──────────────────────────────────── */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 max-w-6xl mx-auto">
        <nav
          className={`rounded-full border ${borderColor} px-4 py-2.5 transition-all duration-300 ${
            scrolled
              ? "backdrop-blur-2xl shadow-[var(--shadow-md)] bg-[var(--bg-overlay)]"
              : "backdrop-blur-xl bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo + Brand */}
            <a href="#" className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none">
              <LogoMark size={32} />
              <div className="flex items-baseline gap-1">
                <span className={`font-heading font-extrabold text-[17px] tracking-tight ${textPrimary}`}>VoltOps</span>
                <span className="text-[10px] font-bold text-[#d4f43e] dark:text-[#d4f43e] text-emerald-600">●</span>
              </div>
            </a>

            {/* Desktop Center Nav Pills */}
            <div className="hidden lg:flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)]">
              {[
                ["#services", "Services"],
                ["#how", "How It Works"],
                ["#dispatch", "Operations"],
                ["#packages", "Plans"],
                ["#about", "About"],
                ["#contact", "Contact"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden lg:flex items-center gap-2.5">
              <ThemeToggle />
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              >
                Sign in
              </Link>
              <a
                href="#packages"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#d4f43e] text-[#06090e] shadow-[0_0_16px_rgba(212,244,62,0.35)] hover:bg-[#e2f865] transition-all"
              >
                <span>Choose Plan</span>
                <ArrowRightIcon size={12} />
              </a>
            </div>

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`lg:hidden p-2 rounded-full border ${borderColor} ${textMuted} hover:text-[var(--text-primary)]`}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className={`lg:hidden pt-4 pb-2 border-t mt-3 ${borderColor} space-y-2`}>
              <div className="pb-2 mb-2 flex justify-center">
                <ThemeToggle />
              </div>
              {[
                ["#services", "Services"],
                ["#how", "How It Works"],
                ["#dispatch", "Operations"],
                ["#packages", "Plans"],
                ["#about", "About"],
                ["#contact", "Contact"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                >
                  {label}
                </a>
              ))}
              <div className="pt-2 flex gap-2">
                <Link
                  to="/login"
                  className="w-1/2 text-center py-2 rounded-full text-xs font-semibold border border-[var(--border)] text-[var(--text-primary)]"
                >
                  Sign in
                </Link>
                <a
                  href="#packages"
                  onClick={() => setMenuOpen(false)}
                  className="w-1/2 text-center py-2 rounded-full text-xs font-bold bg-[#d4f43e] text-[#06090e]"
                >
                  Choose a Plan
                </a>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── HERO SECTION (SYNERGEUS EDITORIAL ARCHITECTURE) ─────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden pt-12 pb-24 lg:pt-16 lg:pb-32 text-center">
        {/* Atmospheric ambient bokeh & glow (Chartreuse + Emerald + Amber) */}
        <div className="hero-glow-blob-1 absolute top-0 left-1/2 -translate-x-1/2 w-[48rem] h-[34rem] rounded-full blur-[140px] pointer-events-none animate-ambient-drift" />
        <div className="hero-glow-blob-2 absolute top-1/4 left-1/4 w-[36rem] h-[28rem] rounded-full blur-[120px] pointer-events-none animate-ambient-drift-rev" />
        <div className="hero-glow-blob-3 absolute top-1/3 right-1/4 w-[32rem] h-[24rem] rounded-full blur-[110px] pointer-events-none animate-pulse-subtle" />

        {/* Soft grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(var(--text-muted) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 65% 55% at 50% 25%, #000 20%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 25%, #000 20%, transparent 80%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-5">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-xl mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4f43e] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4f43e]" />
            </span>
            <span className="text-[var(--text-secondary)] font-medium">
              Multi-Trade Emergency Response · 24/7 Operations
            </span>
          </div>

          {/* Centered Editorial Headline with Italic Serif */}
          <h1 className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-[68px] tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-4xl mx-auto">
            Our platform simplifies your{" "}
            <span className="font-serif-italic font-normal">
              facility operations
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mt-5">
            VoltOps coordinates licensed professionals across electrical, HVAC, security, IT,
            and facility upkeep — backed by guaranteed coverage windows, physical arrival SLAs,
            and human dispatcher oversight.
          </p>

          {/* Pill CTA Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-7">
            <a
              href="#packages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm bg-[#d4f43e] text-[#06090e] shadow-[0_0_24px_rgba(212,244,62,0.35)] hover:bg-[#e2f865] hover:shadow-[0_0_32px_rgba(212,244,62,0.5)] transition-all transform hover:-translate-y-0.5"
            >
              <span>Explore Coverage Plans</span>
              <ArrowRightIcon size={15} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all"
            >
              <CompassIcon size={15} className="text-[#d4f43e]" />
              <span>See How It Works</span>
            </a>
          </div>

          {/* ── 3-Element Elevated Centerpiece (Like Synergeus Reference) ─── */}
          <div className="mt-14 relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">

            {/* Left Flanking Proof Card */}
            <div className="hidden lg:flex lg:col-span-3 flex-col text-left p-5 rounded-2xl glass-panel space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Nationally Recognized
              </span>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4f43e]" />
                  <span>5 Commercial Trades</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4f43e]" />
                  <span>20 & 40-Min Arrival SLAs</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4f43e]" />
                  <span>100% Dispatcher Verified</span>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
                Every breakdown is matched by proximity, licensing, and real-time workload.
              </p>
            </div>

            {/* Center Focal Card: Dispatch Coordination Hub */}
            <div className="lg:col-span-6">
              <div
                className="rounded-3xl border border-[var(--border-strong)] p-5 sm:p-6 text-left relative glass-panel shadow-[var(--shadow-float)]"
                style={{
                  background: isDark
                    ? "radial-gradient(circle at 50% 0%, rgba(212,244,62,0.12) 0%, rgba(14,20,29,0.85) 65%)"
                    : "radial-gradient(circle at 50% 0%, rgba(212,244,62,0.2) 0%, rgba(255,255,255,0.92) 75%)",
                }}
              >
                {/* Console header */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4f43e] animate-pulse" />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      DISPATCH CONSOLE v2.6
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d4f43e]/20 text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800 border border-[#d4f43e]/30">
                    Live Telemetry
                  </span>
                </div>

                {/* Trade category pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-[var(--border)] no-scrollbar">
                  {SCENARIOS.map((s) => {
                    const isActive = s.id === activeId;
                    const SvgIcon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border focus:outline-none ${
                          isActive
                            ? "border-[#d4f43e] bg-[#d4f43e] text-[#06090e] font-bold shadow-sm"
                            : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                        }`}
                      >
                        <SvgIcon size={13} className={isActive ? "text-[#06090e]" : "text-[var(--text-muted)]"} />
                        <span>{s.categoryLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Work Order Body */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ActiveIcon size={14} style={{ color: scenario.accentColor }} />
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: scenario.accentColor }}>
                            {scenario.categoryLabel}
                          </span>
                        </div>
                        <h3 className={`text-sm font-bold leading-snug ${textPrimary}`}>{scenario.title}</h3>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>{scenario.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                          {scenario.urgency}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold mt-1 text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
                          <ClockIcon size={12} />
                          <span>ETA {fmt(times[scenario.id] ?? 0)}</span>
                        </div>
                        <span className={`text-[10px] block ${textMuted}`}>{scenario.slaText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Technician match card */}
                  <div className="p-3.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-2)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#d4f43e] text-[#06090e] font-bold">
                          <UserCheckIcon size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${textPrimary}`}>{scenario.tech.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                              {scenario.tech.matchScore}% Match
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${textSecondary}`}>
                            {scenario.tech.role} · {scenario.tech.distanceText}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs border-t border-[var(--border)] pt-2 text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-secondary)]">Dispatcher note:</span>{" "}
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

                  {/* Pipeline */}
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] pt-1">
                    {["Reported", "Reviewed", "Assigned", "En Route", "On Site"].map((label, i) => (
                      <div
                        key={i}
                        className={`py-1 rounded-lg font-medium ${
                          i < 3
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold"
                            : i === 3
                            ? "bg-[#d4f43e] text-[#06090e] font-bold"
                            : "text-[var(--text-muted)] border border-[var(--border)] bg-[var(--bg-surface)]"
                        }`}
                      >
                        {i + 1}. {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Flanking Value Card */}
            <div className="hidden lg:flex lg:col-span-3 flex-col text-left p-5 rounded-2xl glass-panel space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
                Guaranteed Physical Arrival
              </span>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                VoltOps coordinates qualified technicians across electrical, mechanical, security, IT,
                and facility maintenance under a single unified coordination SLA.
              </p>
              <a
                href="#packages"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700 hover:underline pt-2 border-t border-[var(--border)]"
              >
                <span>Learn more about SLAs</span>
                <ArrowRightIcon size={12} />
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* ── Section 2: Social Proof / Logos (Synergeus Style) ─────────── */}
      <section className="py-12 border-y border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-6">
            Trusted by facility managers across critical industries
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-2"><BuildingIcon size={16} /> Commercial Real Estate</span>
            <span className="flex items-center gap-2"><ServerIcon size={16} /> Data & Cloud Facilities</span>
            <span className="flex items-center gap-2"><ShieldCheckIcon size={16} /> Industrial Logistics</span>
            <span className="flex items-center gap-2"><ZapIcon size={16} /> Manufacturing Plants</span>
            <span className="flex items-center gap-2"><WrenchIcon size={16} /> Corporate Headquarters</span>
          </div>
        </div>
      </section>

      {/* ── Section 3: Three Tall Glassmorphic Feature Cards ───────────── */}
      <section id="services" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
            Intelligent Operations
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Your personal{" "}
            <span className="font-serif-italic font-normal">
              dispatch operations
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Combining smart candidate proximity algorithms with experienced human dispatcher oversight.
          </p>
        </div>

        {/* 3 Tall Cards Side-by-Side (Matching Synergeus Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Natural Language Intake */}
          <div className="p-7 rounded-3xl border border-[var(--border)] glow-card-lime glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-5">
              {/* Simulated mini card widget */}
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogoMark size={22} />
                    <span className="text-[11px] font-bold text-[var(--text-primary)]">Instant Intake</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d4f43e]/20 text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800">
                    Smart Match
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                  "Chiller compressor tripping on 2nd floor retail outlets..."
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[10px]">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ HVAC Trade Assigned</span>
                  <span className="font-bold text-[var(--accent)]">AUTO-ROUTED</span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">Natural Language Intake</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                  Submit emergency breakdown requests from any browser or phone in plain language.
                  Our system classifies trade requirements instantly.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[var(--border)] mt-6 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Zero training required</span>
              <ArrowRightIcon size={14} className="text-[#d4f43e]" />
            </div>
          </div>

          {/* Card 2: Predictive SLA & Proximity Tracking */}
          <div className="p-7 rounded-3xl border border-[var(--border)] glow-card-emerald glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-5">
              {/* Simulated chart / metric widget */}
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-3 text-center shadow-inner">
                <span className="text-[11px] font-bold text-[var(--text-muted)] block">Arrival SLA Commitment</span>
                <div className="text-3xl font-extrabold font-heading text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
                  20 & 40 min
                </div>
                {/* Visual bar */}
                <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#d4f43e] h-full rounded-full" style={{ width: "92%" }} />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block">Physical on-site arrival guarantee</span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">Predictive Proximity</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                  Routing considers real-time technician GPS coordinates, current job duration, and traffic buffers
                  to ensure arrival deadlines are met.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[var(--border)] mt-6 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>SLA enforcement built-in</span>
              <ArrowRightIcon size={14} className="text-[#d4f43e]" />
            </div>
          </div>

          {/* Card 3: Smart Multi-Trade Categorization */}
          <div className="p-7 rounded-3xl border border-[var(--border)] glow-card-amber glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-5">
              {/* Interactive tag pills */}
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-2.5 shadow-inner">
                <span className="text-[11px] font-bold text-[var(--text-muted)] block">Unified Coverage</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
                    ❄️ Commercial HVAC
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    ⚡ High-Voltage Power
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300">
                    📹 CCTV & Access
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                    💻 Core Networks
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">Smart Categorization</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                  Replace fragmented contractors. Five core operational disciplines coordinated under a single
                  responsible coordination desk.
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-[var(--border)] mt-6 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>All 5 trades under 1 plan</span>
              <ArrowRightIcon size={14} className="text-[#d4f43e]" />
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 4: Testimonials (Jewel-Tone Smoked Glass Cards) ─────── */}
      <section className="py-24 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
              Hear Real Voices
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
              What facilities say{" "}
              <span className="font-serif-italic font-normal">
                about VoltOps
              </span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              How business operations managers eliminate facility downtime with guaranteed arrival SLAs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                quote: "When our central chiller failed at 2 PM, VoltOps had an engineer on site in 18 minutes. It saved our ground floor operations.",
                author: "Tarek Mansoor",
                role: "Operations Director · Apex Retail",
                glow: "glow-card-lime",
              },
              {
                quote: "No more calling 10 contractors. One breakdown ticket, transparent candidate score, and a licensed electrician is on site.",
                author: "Sadia Rahman",
                role: "Plant Head · ABC Manufacturing",
                glow: "glow-card-emerald",
              },
              {
                quote: "Having itemized digital service logs and verified technician licenses has transformed our quarterly compliance audit.",
                author: "Kabir Hossain",
                role: "Security Director · Northstar Logistics",
                glow: "glow-card-amber",
              },
              {
                quote: "Our POS switches were rebooting on Black Friday. VoltOps's technician arrived in 9 mins with the exact replacement hardware.",
                author: "Farhan Ali",
                role: "IT Infrastructure · Metro Mart",
                glow: "glow-card-indigo",
              },
            ].map(({ quote, author, role, glow }, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl border border-[var(--border)] glass-panel ${glow} flex flex-col justify-between hover:-translate-y-1 transition-all`}
              >
                <p className="text-xs leading-relaxed text-[var(--text-secondary)] italic">
                  "{quote}"
                </p>
                <div className="pt-4 border-t border-[var(--border)] mt-4">
                  <div className="font-bold text-xs text-[var(--text-primary)]">{author}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Bento Operations Analytics ──────────────────────── */}
      <section id="dispatch" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
            Analytics & Accountability
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Smarter facility care{" "}
            <span className="font-serif-italic font-normal">
              insights at a glance
            </span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Keep your equipment uptime and maintenance records in sync with accountable tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left Bento: Operations Summary */}
          <div className="lg:col-span-6 p-7 rounded-3xl border border-[var(--border)] glass-panel glow-card-lime space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Facility Health</span>
                <div className="text-2xl font-extrabold font-heading text-[var(--text-primary)] mt-1">99.8% Uptime</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#d4f43e]/20 text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800">
                Active Cycle
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: "Preventative Maintenance", val: "100% on schedule", progress: 100, color: "#d4f43e" },
                { label: "Arrival SLA Compliance", val: "0 Breaches across 42 jobs", progress: 100, color: "#10b981" },
                { label: "Licensed Technician Coverage", val: "100% verified credentials", progress: 100, color: "#38bdf8" },
              ].map(({ label, val, progress, color }) => (
                <div key={label} className="p-3.5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text-primary)]">{label}</span>
                    <span className="text-[var(--text-muted)]">{val}</span>
                  </div>
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Bento: Transparent Candidate Evaluation */}
          <div className="lg:col-span-6 p-7 rounded-3xl border border-[var(--border)] glass-panel space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold font-heading text-base text-[var(--text-primary)]">Candidate Audit Trail</h3>
                <span className="text-xs text-[var(--text-muted)]">Live match breakdown — WO #3088</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--bg-surface-2)] text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800 border border-[var(--border)]">
                CCTV & Access
              </span>
            </div>

            {/* Top Match */}
            <div className="p-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-2)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheckIcon size={16} className="text-emerald-500" />
                  <span className="font-bold text-sm text-[var(--text-primary)]">Tanvir Hasan</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  91% Match
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Certified CCTV & NVR Specialist · Tejgaon · 0 active jobs</p>
              <div className="flex gap-3 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span>✓ Safety Cert</span><span>✓ Free Now</span><span>✓ 2.1 km</span>
              </div>
            </div>

            {/* 2nd Match */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--text-secondary)]">Mehedi Zaman</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  78% Match
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Security Tech · 1 active job in Banani</p>
            </div>

            {/* Ineligible */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] opacity-60">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--text-muted)]">Nayeem Islam</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                  Ineligible
                </span>
              </div>
              <p className="text-xs text-red-500 mt-1">✕ Certification expired 12 days ago (filtered automatically)</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 6: How It Works ────────────────────────────────────── */}
      <section id="how" className="py-24 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
              How VoltOps resolves{" "}
              <span className="font-serif-italic font-normal">
                facility breakdowns
              </span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              A transparent path from subscription to completed on-site sign-off.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  className={`p-5 rounded-3xl border border-[var(--border)] glass-panel transition-all duration-200 cursor-default ${
                    isHov ? "-translate-y-2 border-[#d4f43e] shadow-[var(--shadow-md)]" : ""
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all"
                    style={{
                      background: isHov ? "#d4f43e" : "var(--bg-surface-2)",
                      color: isHov ? "#06090e" : "var(--text-primary)",
                    }}
                  >
                    <StepIcon size={20} />
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700 mb-1">
                    Step 0{step}
                  </div>
                  <h3 className="font-bold font-heading text-sm text-[var(--text-primary)] mb-2">{title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 7: Subscription Plans ──────────────────────────────── */}
      <section id="packages" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
            Coverage Plans
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Choose your facility{" "}
            <span className="font-serif-italic font-normal">
              coverage schedule
            </span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            All plans include qualified coordination across all five service trades.
          </p>
        </div>

        {/* SLA clarification */}
        <div
          className="max-w-2xl mx-auto mb-12 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 glass-panel"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <ClockIcon size={18} className="shrink-0 text-[#d4f43e] mt-0.5" />
          <div className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">What does "arrival SLA" mean?</strong>{" "}
            The assigned technician physically arrives at your facility within the stated window — not merely an email acknowledgement.
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">

          {/* Plan A: 8-Hour Daily */}
          <div className="p-7 rounded-3xl border border-[var(--border)] glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">8-Hour Daily</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[var(--border)] text-[var(--text-muted)]">
                  Plan A
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Defined daily operational window</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-[var(--text-primary)]">Pricing to be announced</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">8 hours per day coverage</div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className="text-xs text-[var(--text-muted)] block">Coverage window:</span>
                <span className="text-base font-bold text-[var(--text-primary)]">8 hours per day</span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                For businesses that operate during standard daily hours. Contact us for custom shift arrangements.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("8hr")}
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border border-[var(--border)] hover:border-[#d4f43e] hover:text-[#d4f43e] transition-colors"
            >
              Select Plan A
            </button>
          </div>

          {/* Plan B: 24/7 Standard */}
          <div className="p-7 rounded-3xl border border-[var(--border)] glass-panel glow-card-emerald flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">24/7 Standard</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Plan B
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Round-the-clock reliable coverage</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-[var(--text-primary)]">Pricing to be announced</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">★ 24 hours · 7 days a week</div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className="text-xs text-[var(--text-muted)] block">Arrival SLA commitment:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">Within 40 minutes on site</span>
              </div>

              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {["All 5 service trades covered", "Human dispatcher verification every job", "Digital job history & itemised invoices"].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />{b}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("247-standard")}
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border border-[var(--border)] hover:border-[#d4f43e] hover:text-[#d4f43e] transition-colors"
            >
              Select Plan B
            </button>
          </div>

          {/* Plan C: 24/7 Priority — FEATURED WITH CHARTREUSE GLOW */}
          <div
            className="p-7 rounded-3xl border-2 border-[#d4f43e] glass-panel glow-card-lime flex flex-col justify-between relative hover:-translate-y-1 transition-all shadow-[0_0_32px_rgba(212,244,62,0.18)]"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#d4f43e] text-[#06090e] text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1">
              <ZapIcon size={12} />
              <span>Fastest Response</span>
            </div>

            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">24/7 Priority</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#d4f43e]/20 text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800 border border-[#d4f43e]/40">
                  Plan C
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">For time-critical facilities</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-[var(--text-primary)]">Pricing to be announced</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">24/7 · 2× faster arrival SLA</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#d4f43e]/40 bg-[#d4f43e]/10">
                <span className="text-xs font-semibold text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800 block">Arrival SLA commitment:</span>
                <span className="text-xl font-extrabold font-heading text-[var(--text-primary)]">Within 20 minutes on site</span>
              </div>

              <ul className="space-y-2 text-xs">
                {["20-min rapid arrival (2× faster)", "Top-tier emergency dispatcher priority", "Full asset service history & preventative alerts"].map((b, i) => (
                  <li key={b} className={`flex items-center gap-2 ${i === 0 ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                    <CheckIcon className="w-3.5 h-3.5 text-[#d4f43e]" />{b}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("247-priority")}
              className="mt-6 w-full py-3.5 rounded-full font-bold text-xs bg-[#d4f43e] text-[#06090e] shadow-[0_0_20px_rgba(212,244,62,0.35)] hover:bg-[#e2f865] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Select Plan C</span>
              <ArrowRightIcon size={13} />
            </button>
          </div>

          {/* Plan D: Custom Coverage */}
          <div className="p-7 rounded-3xl border border-[var(--border)] glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">Custom Coverage</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[var(--border)] text-[var(--text-muted)]">
                  Plan D
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Tailored to your requirements</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-[var(--text-primary)]">Pricing upon review</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Discussed after review</div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className="text-xs text-[var(--text-muted)] block">Example schedules:</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">6, 8, or 16 hours/day</span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Request a tailored schedule matching your facility shift hours. SLAs confirmed after requirements review.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("custom")}
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border-2 border-[#d4f43e] text-[var(--text-primary)] hover:bg-[#d4f43e] hover:text-[#06090e] transition-all"
            >
              Discuss a Custom Plan →
            </button>
          </div>

        </div>

        {/* Expandable Comparison Matrix */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all"
          >
            {showMatrix ? "Hide Plan Comparison ▲" : "Compare All Plans ▼"}
          </button>
        </div>

        {showMatrix && (
          <div className="mt-6 rounded-3xl border border-[var(--border)] overflow-hidden shadow-[var(--shadow-md)] glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)]">
                    <th className="py-4 px-5 font-semibold text-[var(--text-secondary)]">Feature</th>
                    <th className="py-4 px-5 font-semibold text-[var(--text-secondary)]">Plan A · 8-Hour</th>
                    <th className="py-4 px-5 font-semibold text-[var(--text-secondary)]">Plan B · 24/7 Std</th>
                    <th className="py-4 px-5 font-bold text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800">Plan C · 24/7 Priority</th>
                    <th className="py-4 px-5 font-semibold text-[var(--text-secondary)]">Plan D · Custom</th>
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
                      <td className="py-3.5 px-5 font-medium text-[var(--text-primary)]">{feat}</td>
                      <td className="py-3.5 px-5 text-[var(--text-muted)]">{a}</td>
                      <td className="py-3.5 px-5 text-[var(--text-muted)]">{b}</td>
                      <td className="py-3.5 px-5 font-bold text-[#d4f43e] dark:text-[#d4f43e] text-emerald-800">{c}</td>
                      <td className="py-3.5 px-5 text-[var(--text-muted)]">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 8: Role Workspaces ─────────────────────────────────── */}
      <section className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
              Role Workspaces
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[var(--text-primary)]">
              Tailored tools for every stakeholder
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BuildingIcon, title: "Business Customer", body: "Submit problems, monitor arrival countdowns, review equipment history, and approve digital invoices." },
              { icon: RadioIcon, title: "Dispatcher Console", body: "Review incoming requests, compare candidates with transparent scores, enforce SLAs, and confirm assignments." },
              { icon: WrenchIcon, title: "Field Technician", body: "Access today's job roster, update travel and on-site progress, manage certifications, and report completion." },
              { icon: SettingsIcon, title: "Administrator", body: "Oversee workforce accounts, review audit trails, monitor SLA breach reports, and configure service boundaries." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-6 rounded-3xl border border-[var(--border)] glass-panel hover:-translate-y-1 transition-all">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#d4f43e] mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-bold font-heading text-base text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 9: About VoltOps ─────────────────────────────────────── */}
      <section id="about" className="py-24 max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
              About VoltOps
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)] leading-tight">
              Built for commercial{" "}
              <span className="font-serif-italic font-normal">
                field service coordination
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Most businesses still handle facility breakdowns through scattered phone books, chat groups, and unverified contractors.
              When a commercial chiller stalls, a security camera drops, or a generator falters, delays cost operational revenue.
            </p>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              VoltOps replaces guesswork with an accountable coordination infrastructure — connecting business managers with vetted
              technicians across electrical, mechanical, security, IT, and facility upkeep, backed by physical arrival commitments and
              human dispatcher accountability.
            </p>
          </div>
          <div className="lg:col-span-5 space-y-3.5">
            {[
              { title: "No uncertified technicians", body: "Safety credentials and trade licences are verified before assignment eligibility." },
              { title: "No double bookings", body: "Active job workloads and transit distances prevent technician overcommitment." },
              { title: "Real operational accountability", body: "Customers monitor verified technician transit and itemised billing records." },
            ].map(({ title, body }) => (
              <div key={title} className="p-5 rounded-2xl border border-[var(--border)] glass-panel space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                  <CheckCircleIcon size={16} className="text-[#d4f43e] shrink-0" />
                  <span>{title}</span>
                </div>
                <p className="text-xs pl-6 text-[var(--text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 10: Contact & Direct Inquiries ───────────────────────── */}
      <section id="contact" className="py-24 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          {/* Banner */}
          <div
            className="p-8 sm:p-12 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 glass-panel glow-card-lime mb-16 border border-[#d4f43e]/40"
          >
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)]">
                Ready to safeguard your facility operations?
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Select a coverage plan or discuss a custom schedule with our team.
              </p>
            </div>
            <a
              href="#packages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-bold bg-[#d4f43e] text-[#06090e] shrink-0 shadow-md hover:bg-[#e2f865] transition-all"
            >
              <span>View Plans</span>
              <ArrowRightIcon size={14} />
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
            {/* Contact info */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#d4f43e] dark:text-[#d4f43e] text-emerald-700">
                  Direct Inquiries
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-heading mt-2 text-[var(--text-primary)]">
                  Talk with our team
                </h2>
                <p className="text-sm mt-2 text-[var(--text-muted)]">
                  Enterprise facility questions or multiple sites? Send our coordination desk a message.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: MailIcon, label: "Email", value: "support@voltops.example" },
                  { icon: PhoneIcon, label: "Phone", value: "+880 1XXX-XXXXXX" },
                  { icon: MapPinIcon, label: "Coordination Center", value: "Dhaka, Bangladesh" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-[var(--border)] glass-panel">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#d4f43e] shrink-0">
                      <Icon size={17} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold block text-[var(--text-muted)]">{label}</span>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-7">
              <div className="p-7 rounded-3xl border border-[var(--border)] glass-panel shadow-sm">
                <h3 className="text-lg font-bold font-heading mb-1 text-[var(--text-primary)]">Send an inquiry</h3>
                <p className="text-xs mb-5 text-[var(--text-muted)]">
                  For sales and facility scheduling inquiries. For emergency repairs, subscribe and log in to dispatch.
                </p>
                {contactDone ? (
                  <div className="p-4 rounded-2xl text-sm border flex items-center gap-2 border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon size={18} />
                    <span>Thank you! Your inquiry has been noted. Our team will reply within one working day.</span>
                  </div>
                ) : (
                  <form onSubmit={handleContact} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">Your Name</label>
                        <input
                          type="text"
                          required
                          value={cName}
                          onChange={(e) => setCName(e.target.value)}
                          placeholder="Karim Rahman"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#d4f43e]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">Business Email</label>
                        <input
                          type="email"
                          required
                          value={cEmail}
                          onChange={(e) => setCEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#d4f43e]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">Company / Facility Name</label>
                      <input
                        type="text"
                        value={cCompany}
                        onChange={(e) => setCCompany(e.target.value)}
                        placeholder="Apex Galleria Ltd."
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#d4f43e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">Message</label>
                      <textarea
                        rows={4}
                        required
                        value={cMsg}
                        onChange={(e) => setCMsg(e.target.value)}
                        placeholder="Tell us about your facility locations and coverage requirements..."
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#d4f43e] resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold bg-[#d4f43e] text-[#06090e] hover:bg-[#e2f865] transition-all shadow-md"
                    >
                      <span>Send Message</span>
                      <ArrowRightIcon size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-8 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              © 2026 VoltOps · Subscription-based field service coordination
            </span>
          </div>
          <div className="text-xs text-[var(--text-muted)]">CSE 400 project, BUBT</div>
        </div>
      </footer>

    </div>
  );
}
