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

// ── 5 Core Commercial Service Trades (Simple, Non-AI, Plain English) ─────
interface ServiceTrade {
  id: string;
  title: string;
  icon: FC<IconProps>;
  accentColor: string;
  glowClass: string;
  badge: string;
  simpleIssue: string;
  slaBadge: string;
  simpleDesc: string;
  simplePoints: string[];
}

const CORE_SERVICES: ServiceTrade[] = [
  {
    id: "hvac",
    title: "AC & Cooling",
    icon: SnowflakeIcon,
    accentColor: "#38bdf8",
    glowClass: "glow-card-cyan",
    badge: "AC / HVAC",
    simpleIssue: "Chillers, split ACs, or gas leaks",
    slaBadge: "20–40 Min",
    simpleDesc: "Emergency repairs for commercial ACs, chillers, and cooling systems.",
    simplePoints: ["Central ACs & Chillers", "Gas Leaks & Cooling", "Fast Part Replacement"],
  },
  {
    id: "electrical",
    title: "Electrical & Power",
    icon: ZapIcon,
    accentColor: "#f59e0b",
    glowClass: "glow-card-amber",
    badge: "Electrical",
    simpleIssue: "Breaker trips, outages, or generator failure",
    slaBadge: "20–40 Min",
    simpleDesc: "Licensed electricians on site to restore power, panels, and generators.",
    simplePoints: ["Backup Generators", "Main Breaker Trips", "Short Circuits & Wiring"],
  },
  {
    id: "security",
    title: "CCTV & Security",
    icon: ShieldCheckIcon,
    accentColor: "#a855f7",
    glowClass: "glow-card-purple",
    badge: "Security",
    simpleIssue: "Cameras offline or door locks stuck",
    slaBadge: "20–40 Min",
    simpleDesc: "Quick repairs for CCTV systems, DVR recorders, and access doors.",
    simplePoints: ["Offline CCTV Cameras", "Biometric Door Access", "Gates & Security Alarms"],
  },
  {
    id: "it",
    title: "Internet & Network",
    icon: ServerIcon,
    accentColor: "#10b981",
    glowClass: "glow-card-emerald",
    badge: "Network & IT",
    simpleIssue: "Office Wi-Fi down or router failure",
    slaBadge: "20–40 Min",
    simpleDesc: "Network engineers to fix office Wi-Fi, switches, and internet lines.",
    simplePoints: ["Office Wi-Fi & Routers", "Server Racks & Switches", "Billing & POS Lines"],
  },
  {
    id: "facility",
    title: "Plumbing & Repairs",
    icon: WrenchIcon,
    accentColor: "#f43f5e",
    glowClass: "glow-card-indigo",
    badge: "Plumbing & Fixes",
    simpleIssue: "Water pipe bursts or jammed doors",
    slaBadge: "20–40 Min",
    simpleDesc: "Emergency plumbing, automatic glass doors, and building upkeep.",
    simplePoints: ["Water Pipe Bursts", "Glass & Auto Doors", "General Building Upkeep"],
  },
];

// ── Workflow Steps ───────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { step: 1, icon: FileTextIcon, title: "Choose a Plan", body: "Pick the coverage schedule and arrival time that fits your building." },
  { step: 2, icon: AlertTriangleIcon, title: "Report Problem", body: "Select what is broken and tap submit from your phone or laptop." },
  { step: 3, icon: CompassIcon, title: "Quick Review", body: "Our operations desk assigns the closest licensed expert in minutes." },
  { step: 4, icon: ZapIcon, title: "Expert Arrives", body: "Your qualified technician physically arrives within 20 to 40 minutes." },
  { step: 5, icon: CheckCircleIcon, title: "Job Done & Sign-off", body: "Approve the completed work and get a clear digital repair receipt." },
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
                ? "bg-[#10b981] text-[#06090e] dark:bg-[#10b981] dark:text-[#06090e] shadow-sm font-bold"
                : "text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)]"
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

// ── Logo Mark with Live Pulsing Energy ────────────────────────────────────
function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(16,185,129,0.7)] group-hover:rotate-3 overflow-hidden cursor-pointer"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Dynamic scanline shimmer effect on hover */}
      <span className="absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      
      {/* Live ambient pulse ring */}
      <span className="absolute inset-0 rounded-2xl border border-white/30 opacity-75 animate-pulse" />

      <ZapIcon size={Math.round(size * 0.52)} className="relative text-white drop-shadow transition-transform duration-300 group-hover:scale-110" />
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

  // Active Trade Spotlight in Hero Centerpiece
  const [heroActiveTrade, setHeroActiveTrade] = useState<string>("hvac");
  const selectedTrade = CORE_SERVICES.find((s) => s.id === heroActiveTrade) || CORE_SERVICES[0];
  const SelectedIcon = selectedTrade.icon;

  // Workflow step hover (hover-only)
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
    setCName("");
    setCEmail("");
    setCCompany("");
    setCMsg("");
  };

  const handlePlan = (plan: PlanId) => {
    if (plan === "custom") {
      const el = document.getElementById("contact");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/register?package=${plan}`);
    }
  };

  const borderColor = "border-[var(--border)]";

  return (
    <div
      className="relative min-h-screen font-sans selection:bg-[#10b981] selection:text-[#06090e]"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* ── Fixed Persistent Page Background (Matching Hero Commercial Architecture) ── */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: "url('/images/hero-building.jpg')",
          backgroundAttachment: "fixed",
          backgroundPosition: "center top",
        }}
        aria-hidden="true"
      >
        {/* Tint overlay ensuring cards glide cleanly while architectural towers remain visible */}
        <div className="absolute inset-0 bg-[#f7f6f0]/65 dark:bg-[#06090e]/88 backdrop-blur-[2px] dark:backdrop-blur-[8px]" />
      </div>

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
            {/* Logo + Brand with Live Status Indicator */}
            <a href="#" className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none">
              <LogoMark size={32} />
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-[17px] tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
                  VoltOps
                </span>
                {/* Live pulsing online beacon */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
            </a>

            {/* Desktop Center Nav Pills */}
            <div className="hidden lg:flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)]">
              {[
                ["#services", "Services"],
                ["#dispatch", "Operations"],
                ["#how", "How It Works"],
                ["#packages", "Plans"],
                ["#about", "About"],
                ["#contact", "Contact"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-full text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
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
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)] transition-all"
              >
                Sign in
              </Link>
              <a
                href="#packages"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-[#34d399] transition-all"
              >
                <span>Choose Plan</span>
                <ArrowRightIcon size={12} />
              </a>
            </div>

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`lg:hidden p-2 rounded-full border ${borderColor} text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)]`}
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
                ["#dispatch", "Operations"],
                ["#how", "How It Works"],
                ["#packages", "Plans"],
                ["#about", "About"],
                ["#contact", "Contact"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
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
                  className="w-1/2 text-center py-2 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e]"
                >
                  Choose a Plan
                </a>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── HERO SECTION (PROJECT-RELEVANT COMMERCIAL ARCHITECTURE) ─────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden pt-12 pb-24 lg:pt-16 lg:pb-32 text-center">
        {/* Commercial Building Background — Rich, vivid, project relevant */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-1">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 opacity-90 dark:opacity-65"
            style={{
              backgroundImage: "url('/images/hero-building.jpg')",
              backgroundPosition: "center 25%",
            }}
          />
          {/* Radial dark vignette around headline for razor-sharp readability */}
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? "radial-gradient(ellipse 85% 70% at 50% 35%, rgba(6,9,14,0.40) 0%, rgba(6,9,14,0.85) 60%, var(--bg-base) 100%)"
                : "radial-gradient(ellipse 90% 75% at 50% 32%, rgba(247,246,240,0.18) 0%, rgba(247,246,240,0.52) 58%, var(--bg-base) 100%)",
            }}
          />
          {/* Bottom fade into page */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[var(--bg-base)]" />
        </div>

        {/* Atmospheric ambient bokeh & glow (Emerald + Mint + Warm Amber) */}
        <div className="hero-glow-blob-1 absolute top-0 left-1/2 -translate-x-1/2 w-[48rem] h-[34rem] rounded-full blur-[140px] pointer-events-none animate-ambient-drift" />
        <div className="hero-glow-blob-2 absolute top-1/4 left-1/4 w-[36rem] h-[28rem] rounded-full blur-[120px] pointer-events-none animate-ambient-drift-rev" />
        <div className="hero-glow-blob-3 absolute top-1/3 right-1/4 w-[32rem] h-[24rem] rounded-full blur-[110px] pointer-events-none animate-pulse-subtle" />

        <div className="relative max-w-6xl mx-auto px-5">
          {/* Centered Editorial Headline with Italic Serif */}
          <h1 className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-[68px] tracking-tight leading-[1.08] text-[var(--text-primary)] max-w-4xl mx-auto drop-shadow-sm">
            Our platform simplifies your{" "}
            <span className="font-serif-italic font-normal">
              facility operations
            </span>
          </h1>

          {/* Luminous, clean, refined subtitle */}
          <p className="text-base sm:text-xl text-slate-800 dark:text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed mt-5 tracking-tight">
            One unified subscription for building repairs — verified licensed technicians at your door in{" "}
            <span className="font-semibold text-emerald-600 dark:text-[#34d399] underline decoration-emerald-500/40 underline-offset-4">
              20 to 40 minutes
            </span>.
          </p>

          {/* Pill CTA Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-7">
            <a
              href="#packages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm bg-[#10b981] text-[#06090e] shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:bg-[#34d399] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5"
            >
              <span>Explore Coverage Plans</span>
              <ArrowRightIcon size={15} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:text-[var(--text-primary)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all"
            >
              <CompassIcon size={15} className="text-[#10b981]" />
              <span>See How It Works</span>
            </a>
          </div>

          {/* ── 3-Element Elevated Centerpiece (Customer-Facing) ─────────── */}
          <div className="mt-14 relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* Left Flanking Proof Card */}
            <div className="hidden lg:flex lg:col-span-3 flex-col justify-between text-left p-6 rounded-[28px] glass-panel glow-card-emerald">
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Guaranteed Standards
                </span>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>5 Core Service Trades</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>20 & 40-Min Physical Arrival</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>Licensed & Verified Staff</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="text-amber-500">★★★★★</span>
                  <span>4.9 / 5.0 Rating</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Trusted across 120+ facilities
                </p>
              </div>
            </div>

            {/* Center Focal Card: Immediate Trade Readiness */}
            <div className="lg:col-span-6">
              <div
                className="rounded-[32px] border border-[var(--border-strong)] p-6 sm:p-7 text-left relative glass-panel glow-card-emerald shadow-[var(--shadow-float)] flex flex-col justify-between h-full"
                style={{
                  background: isDark
                    ? "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.14) 0%, rgba(14,20,29,0.85) 65%)"
                    : "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, rgba(255,255,255,0.95) 75%)",
                }}
              >
                {/* Header status bar */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      24/7 Rapid Response Desk
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399] border border-[#10b981]/30">
                    Live Status: Ready
                  </span>
                </div>

                {/* Main Card Title */}
                <div className="space-y-1.5 mb-5">
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
                    Immediate help for{" "}
                    <span className="font-serif-italic font-normal">
                      building repairs
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Select a service sector below to see how fast we arrive:
                  </p>
                </div>

                {/* Trade Selector Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-[var(--border)] no-scrollbar">
                  {CORE_SERVICES.map((s) => {
                    const isActive = s.id === heroActiveTrade;
                    const SvgIcon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setHeroActiveTrade(s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border focus:outline-none ${
                          isActive
                            ? "border-[#10b981] bg-[#10b981] text-[#06090e] font-bold shadow-sm"
                            : "border-transparent text-slate-600 dark:text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                        }`}
                      >
                        <SvgIcon size={13} className={isActive ? "text-[#06090e]" : "text-slate-500"} />
                        <span>{s.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Trade Preview Box (Simple, clear, easy to understand) */}
                <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-3 mb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${selectedTrade.accentColor}25`, color: selectedTrade.accentColor }}
                      >
                        <SelectedIcon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedTrade.title}</h4>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Common issue: {selectedTrade.simpleIssue}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border"
                      style={{
                        borderColor: `${selectedTrade.accentColor}50`,
                        color: selectedTrade.accentColor,
                        backgroundColor: `${selectedTrade.accentColor}15`,
                      }}
                    >
                      {selectedTrade.slaBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[var(--border)]">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon size={14} className="shrink-0" />
                      <span>Certified Technicians</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon size={14} className="shrink-0" />
                      <span>Fast On-Site Arrival</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Assurance Bar */}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Need emergency repair right now?
                  </span>
                  <a
                    href="#packages"
                    className="inline-flex items-center gap-1 font-bold text-[#10b981] dark:text-[#34d399] hover:underline"
                  >
                    <span>View Plans</span>
                    <ArrowRightIcon size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Flanking Value Card */}
            <div className="hidden lg:flex lg:col-span-3 flex-col justify-between text-left p-6 rounded-[28px] glass-panel glow-card-amber">
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Arrival Guarantee
                </span>
                <h4 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                  Physical presence on site.
                </h4>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  Our licensed technicians physically reach your facility within 20 or 40 minutes when an emergency strikes.
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Plan C (Priority)</span>
                  <span className="font-bold text-[#10b981] dark:text-[#34d399]">20 Minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Plan B (Standard)</span>
                  <span className="font-bold text-slate-900 dark:text-white">40 Minutes</span>
                </div>
                <a
                  href="#packages"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10b981] dark:text-[#34d399] hover:underline pt-2 block"
                >
                  <span>Compare Plans</span>
                  <ArrowRightIcon size={12} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Section 3: The 5 Core Service Sectors (Simple, Easy Names) ─── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="services" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
            Our 5 Services
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            What we fix for your{" "}
            <span className="font-serif-italic font-normal">
              facility
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
            Simple, honest commercial trade coverage. Licensed technicians arrive in 20 to 40 minutes.
          </p>
        </div>

        {/* 5 Core Service Cards (Centered, Balanced Typography, Minimal Copy) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-stretch">
          {CORE_SERVICES.map((trade, idx) => {
            const TradeIcon = trade.icon;
            const isWide = idx >= 3;
            return (
              <div
                key={trade.id}
                className={`p-7 sm:p-8 rounded-[32px] border border-[var(--border)] glass-panel ${trade.glowClass} flex flex-col items-center justify-between text-center hover:-translate-y-1.5 transition-all duration-300 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] group ${
                  isWide ? "lg:col-span-3" : "lg:col-span-2"
                }`}
              >
                <div className="flex flex-col items-center text-center w-full space-y-4">
                  {/* Centered Trade Icon with accent color glow */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-transform duration-300 group-hover:scale-110 shadow-sm"
                    style={{
                      backgroundColor: `${trade.accentColor}18`,
                      color: trade.accentColor,
                      border: `1px solid ${trade.accentColor}35`,
                    }}
                  >
                    <TradeIcon size={26} />
                  </div>

                  {/* Centered SLA Badge */}
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border mx-auto"
                    style={{
                      borderColor: `${trade.accentColor}40`,
                      color: trade.accentColor,
                      backgroundColor: `${trade.accentColor}12`,
                    }}
                  >
                    <span>Arrival SLA · {trade.slaBadge}</span>
                  </span>

                  {/* Centered Title & Minimal Description */}
                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-2xl font-extrabold font-heading text-[var(--text-primary)] tracking-tight text-center">
                      {trade.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 text-center leading-relaxed max-w-xs mx-auto">
                      {trade.simpleDesc}
                    </p>
                  </div>

                  {/* Centered Example Scenario */}
                  <div className="w-full py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-slate-600 dark:text-slate-300 italic text-center font-medium">
                    "{trade.simpleIssue}"
                  </div>

                  {/* Centered 3 Bullet Points */}
                  <div className="w-full space-y-2 pt-3 border-t border-[var(--border)]">
                    {trade.simplePoints.map((pt) => (
                      <div key={pt} className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <CheckCircleIcon size={14} className="text-emerald-500 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Centered Action Link / Button */}
                <div className="pt-5 border-t border-[var(--border)] mt-5 w-full">
                  <a
                    href="#packages"
                    className="w-full py-2.5 rounded-full text-xs font-bold text-center border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:border-[#10b981] hover:text-[#06090e] hover:bg-[#10b981] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>View Plans & SLAs</span>
                    <ArrowRightIcon size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 5: Operations Analytics & Audit Trail ──────────────── */}
      <section id="dispatch" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
            Accountability
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Transparent tracking{" "}
            <span className="font-serif-italic font-normal">
              for your peace of mind
            </span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Monitor real-time arrival progress and verified technician credentials for every job.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left Bento: Operations Summary */}
          <div className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel glow-card-emerald space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Facility Health</span>
                <div className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">99.8% Uptime</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399]">
                Active Cycle
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: "Preventative Maintenance", val: "100% on schedule", progress: 100, color: "#10b981" },
                { label: "Arrival SLA Compliance", val: "0 Breaches across 42 jobs", progress: 100, color: "#34d399" },
                { label: "Licensed Technician Coverage", val: "100% verified credentials", progress: 100, color: "#38bdf8" },
              ].map(({ label, val, progress, color }) => (
                <div key={label} className="p-3.5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-900 dark:text-white">{label}</span>
                    <span className="text-slate-600 dark:text-slate-400">{val}</span>
                  </div>
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Bento: Transparent Candidate Evaluation */}
          <div className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold font-heading text-base text-slate-900 dark:text-white">Candidate Audit Trail</h3>
                <span className="text-xs text-slate-600 dark:text-slate-400">Live match review — Work Order Dispatch</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399] border border-[var(--border)]">
                Verified Matching
              </span>
            </div>

            {/* Top Match */}
            <div className="p-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-2)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheckIcon size={16} className="text-emerald-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Tanvir Hasan</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  91% Match
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">Certified CCTV & NVR Specialist · Tejgaon · 0 active jobs</p>
              <div className="flex gap-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span>✓ Safety Cert</span><span>✓ Free Now</span><span>✓ 2.1 km away</span>
              </div>
            </div>

            {/* 2nd Match */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Mehedi Zaman</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  78% Match
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Security Tech · 1 active job in Banani</p>
            </div>

            {/* Ineligible */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] opacity-70">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-600 dark:text-slate-400">Nayeem Islam</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                  Ineligible
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">✕ Certification expired (filtered automatically)</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 6: How It Works (High Contrast Light & Dark) ────────── */}
      <section id="how" className="py-24 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Simple Steps
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
              How VoltOps resolves{" "}
              <span className="font-serif-italic font-normal">
                breakdowns
              </span>
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              A straightforward path from problem report to verified on-site sign-off.
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
                  className={`p-5 rounded-[28px] border border-[var(--border)] glass-panel transition-all duration-200 cursor-default ${
                    isHov ? "-translate-y-2 border-[#10b981] shadow-[var(--shadow-md)]" : ""
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all shadow-sm"
                    style={{
                      background: isHov ? "#10b981" : "var(--bg-surface-2)",
                      color: isHov ? "#06090e" : "var(--text-primary)",
                    }}
                  >
                    <StepIcon size={20} />
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#34d399] mb-1">
                    Step 0{step}
                  </div>
                  <h3 className="font-bold font-heading text-sm text-[var(--text-primary)] mb-2">{title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">{body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 7: Subscription Plans ──────────────────────────────── */}
      <section id="packages" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
            Coverage Plans
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Choose your facility{" "}
            <span className="font-serif-italic font-normal">
              coverage schedule
            </span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            All plans include qualified coordination across all five service trades.
          </p>
        </div>

        {/* SLA clarification */}
        <div
          className="max-w-2xl mx-auto mb-12 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 glass-panel"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <ClockIcon size={18} className="shrink-0 text-[#10b981] mt-0.5" />
          <div className="text-slate-800 dark:text-slate-200">
            <strong className="text-slate-900 dark:text-white">What does "arrival SLA" mean?</strong>{" "}
            The assigned technician physically arrives at your facility within the stated window — not merely an email acknowledgement.
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">

          {/* Plan A: 8-Hour Daily */}
          <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">8-Hour Daily</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[var(--border)] text-slate-600 dark:text-slate-400">
                  Plan A
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Defined daily operational window</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-slate-900 dark:text-white">Pricing to be announced</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">8 hours per day coverage</div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className="text-xs text-slate-600 dark:text-slate-400 block">Coverage window:</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">8 hours per day</span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                For businesses that operate during standard daily hours. Contact us for custom shift arrangements.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("8hr")}
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:border-[#10b981] hover:text-[#10b981] transition-colors"
            >
              Select Plan A
            </button>
          </div>

          {/* Plan B: 24/7 Standard */}
          <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel glow-card-emerald flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">24/7 Standard</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Plan B
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Round-the-clock reliable coverage</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-slate-900 dark:text-white">Pricing to be announced</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">★ 24 hours · 7 days a week</div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className="text-xs text-slate-600 dark:text-slate-400 block">Arrival SLA commitment:</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">Within 40 minutes on site</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
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
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:border-[#10b981] hover:text-[#10b981] transition-colors"
            >
              Select Plan B
            </button>
          </div>

          {/* Plan C: 24/7 Priority — FEATURED WITH EMERALD GLOW */}
          <div
            className="p-7 rounded-[32px] border-2 border-[#10b981] glass-panel glow-card-emerald flex flex-col justify-between relative hover:-translate-y-1 transition-all shadow-[0_0_32px_rgba(16,185,129,0.22)]"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#10b981] text-[#06090e] text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1">
              <ZapIcon size={12} />
              <span>Fastest Response</span>
            </div>

            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">24/7 Priority</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399] border border-[#10b981]/40">
                  Plan C
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">For time-critical facilities</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-slate-900 dark:text-white">Pricing to be announced</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">24/7 · 2× faster arrival SLA</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#10b981]/40 bg-[#10b981]/10">
                <span className="text-xs font-semibold text-emerald-800 dark:text-[#34d399] block">Arrival SLA commitment:</span>
                <span className="text-xl font-extrabold font-heading text-slate-900 dark:text-white">Within 20 minutes on site</span>
              </div>

              <ul className="space-y-2 text-xs">
                {["20-min rapid arrival (2× faster)", "Top-tier emergency dispatcher priority", "Full asset service history & alerts"].map((b, i) => (
                  <li key={b} className={`flex items-center gap-2 ${i === 0 ? "font-bold text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"}`}>
                    <CheckIcon className="w-3.5 h-3.5 text-[#10b981]" />{b}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("247-priority")}
              className="mt-6 w-full py-3.5 rounded-full font-bold text-xs bg-[#10b981] text-[#06090e] shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-[#34d399] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Select Plan C</span>
              <ArrowRightIcon size={13} />
            </button>
          </div>

          {/* Plan D: Custom Coverage */}
          <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Custom Coverage</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[var(--border)] text-slate-600 dark:text-slate-400">
                  Plan D
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Tailored to your requirements</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-slate-900 dark:text-white">Pricing upon review</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Discussed after review</div>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                <span className="text-xs text-slate-600 dark:text-slate-400 block">Example schedules:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">6, 8, or 16 hours/day</span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Request a tailored schedule matching your facility shift hours. SLAs confirmed after requirements review.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handlePlan("custom")}
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border-2 border-[#10b981] text-slate-900 dark:text-white hover:bg-[#10b981] hover:text-[#06090e] transition-all"
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:text-[var(--text-primary)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all"
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
                    <th className="py-4 px-5 font-semibold text-slate-900 dark:text-white">Feature</th>
                    <th className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">Plan A · 8-Hour</th>
                    <th className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">Plan B · 24/7 Std</th>
                    <th className="py-4 px-5 font-bold text-[#10b981] dark:text-[#34d399]">Plan C · 24/7 Priority</th>
                    <th className="py-4 px-5 font-semibold text-slate-700 dark:text-slate-300">Plan D · Custom</th>
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
                      <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white">{feat}</td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">{a}</td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">{b}</td>
                      <td className="py-3.5 px-5 font-bold text-[#10b981] dark:text-[#34d399]">{c}</td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 8: Role Workspaces (High Contrast Light & Dark) ──────── */}
      <section className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Role Workspaces
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[var(--text-primary)]">
              Tailored tools for every stakeholder
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BuildingIcon, title: "Business Customer", body: "Submit problems, monitor arrival countdowns, review equipment history, and approve digital invoices.", glow: "glow-card-emerald" },
              { icon: RadioIcon, title: "Dispatcher Console", body: "Review incoming requests, compare candidates with transparent scores, enforce SLAs, and confirm assignments.", glow: "glow-card-amber" },
              { icon: WrenchIcon, title: "Field Technician", body: "Access today's job roster, update travel and on-site progress, manage certifications, and report completion.", glow: "glow-card-cyan" },
              { icon: SettingsIcon, title: "Administrator", body: "Oversee workforce accounts, review audit trails, monitor SLA breach reports, and configure service boundaries.", glow: "glow-card-indigo" },
            ].map(({ icon: Icon, title, body, glow }) => (
              <div key={title} className={`p-6 rounded-[28px] border border-[var(--border)] glass-panel ${glow} hover:-translate-y-1 transition-all shadow-[var(--shadow-sm)]`}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399] mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-bold font-heading text-base text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-normal">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 9: About VoltOps ─────────────────────────────────────── */}
      <section id="about" className="py-24 max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              About VoltOps
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)] leading-tight">
              Built for commercial{" "}
              <span className="font-serif-italic font-normal">
                field service coordination
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              VoltOps replaces scattered contractor phone calls with reliable coordination infrastructure — connecting facility managers with vetted technicians across electrical, mechanical, security, IT, and facility upkeep.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Every job is backed by guaranteed arrival SLAs, transparent digital tracking, and certified technicians.
            </p>
          </div>
          <div className="lg:col-span-5 space-y-3.5">
            {[
              { title: "No uncertified technicians", body: "Trade licenses and safety credentials are confirmed before assignment." },
              { title: "No double bookings", body: "Live location and route matching prevent delayed arrivals." },
              { title: "Real accountability", body: "Transparent arrival tracking and digital itemized repair logs." },
            ].map(({ title, body }) => (
              <div key={title} className="p-5 rounded-2xl border border-[var(--border)] glass-panel space-y-1 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                  <CheckCircleIcon size={16} className="text-[#10b981] dark:text-[#34d399] shrink-0" />
                  <span>{title}</span>
                </div>
                <p className="text-xs pl-6 text-[var(--text-secondary)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Customer Feedback / Testimonials (Relocated right before Contact) ── */}
      <section className="py-24 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Customer Feedback
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
              What facilities say{" "}
              <span className="font-serif-italic font-normal">
                about VoltOps
              </span>
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Real results from managers who rely on our guaranteed arrival SLAs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                quote: "When our AC chiller stopped at 2 PM, VoltOps had an engineer on site in 18 minutes. It saved our ground floor stores.",
                author: "Tarek Mansoor",
                role: "Operations Director · Apex Retail",
                glow: "glow-card-cyan",
              },
              {
                quote: "No more calling 10 contractors. One ticket, and a licensed electrician is on site in 20 minutes.",
                author: "Sadia Rahman",
                role: "Plant Head · ABC Manufacturing",
                glow: "glow-card-emerald",
              },
              {
                quote: "Having digital service logs and verified technician licenses has made our safety audits completely stress-free.",
                author: "Kabir Hossain",
                role: "Security Director · Northstar Logistics",
                glow: "glow-card-amber",
              },
              {
                quote: "Our billing switches failed on a busy Friday. VoltOps arrived in 9 mins with the exact replacement switch.",
                author: "Farhan Ali",
                role: "IT Lead · Metro Mart",
                glow: "glow-card-indigo",
              },
            ].map(({ quote, author, role, glow }, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-[28px] border border-[var(--border)] glass-panel ${glow} flex flex-col justify-between hover:-translate-y-1 transition-all shadow-[var(--shadow-sm)]`}
              >
                <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 italic font-medium">
                  "{quote}"
                </p>
                <div className="pt-4 border-t border-[var(--border)] mt-4">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{author}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{role}</div>
                </div>
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
            className="p-8 sm:p-12 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 glass-panel glow-card-emerald mb-16 border border-[#10b981]/40"
          >
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
                Ready to safeguard your facility operations?
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Select a coverage plan or discuss a custom schedule with our team.
              </p>
            </div>
            <a
              href="#packages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] shrink-0 shadow-md hover:bg-[#34d399] transition-all"
            >
              <span>View Plans</span>
              <ArrowRightIcon size={14} />
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
            {/* Contact info */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
                  Direct Inquiries
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-heading mt-2 text-slate-900 dark:text-white">
                  Talk with our team
                </h2>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
                  Enterprise facility questions or multiple sites? Send our coordination desk a message.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: MailIcon, label: "Email", value: "support@voltops.example" },
                  { icon: PhoneIcon, label: "Phone", value: "+880 1XXX-XXXXXX" },
                  { icon: MapPinIcon, label: "Coordination Center", value: "Dhaka, Bangladesh" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-[var(--border)] glass-panel shadow-[var(--shadow-sm)]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399] shrink-0">
                      <Icon size={17} />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold block text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-7">
              <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel shadow-[var(--shadow-sm)]">
                <h3 className="text-lg font-bold font-heading mb-1 text-slate-900 dark:text-white">Send an inquiry</h3>
                <p className="text-xs mb-5 text-slate-600 dark:text-slate-400">
                  For sales and facility scheduling inquiries. For emergency repairs, subscribe and log in to dispatch.
                </p>
                {contactDone ? (
                  <div className="p-4 rounded-2xl text-sm border flex items-center gap-2 border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <CheckCircleIcon size={18} />
                    <span>Thank you! Your inquiry has been noted. Our team will reply within one working day.</span>
                  </div>
                ) : (
                  <form onSubmit={handleContact} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Your Name</label>
                        <input
                          type="text"
                          required
                          value={cName}
                          onChange={(e) => setCName(e.target.value)}
                          placeholder="Karim Rahman"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Business Email</label>
                        <input
                          type="email"
                          required
                          value={cEmail}
                          onChange={(e) => setCEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Company / Facility Name</label>
                      <input
                        type="text"
                        value={cCompany}
                        onChange={(e) => setCCompany(e.target.value)}
                        placeholder="Apex Galleria Ltd."
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Message</label>
                      <textarea
                        rows={4}
                        required
                        value={cMsg}
                        onChange={(e) => setCMsg(e.target.value)}
                        placeholder="Tell us about your facility locations and coverage requirements..."
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981] resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-md"
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
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              © 2026 VoltOps · Subscription-based field service coordination
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">CSE 400 project, BUBT</div>
        </div>
      </footer>

    </div>
  );
}
