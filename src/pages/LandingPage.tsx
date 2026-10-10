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

// ── 5 Core Commercial Service Trades (Customer-Facing) ───────────────────
interface ServiceTrade {
  id: string;
  title: string;
  icon: FC<IconProps>;
  accentColor: string;
  glowClass: string;
  badge: string;
  exampleScenario: string;
  slaBadge: string;
  description: string;
  capabilities: string[];
}

const CORE_SERVICES: ServiceTrade[] = [
  {
    id: "hvac",
    title: "Commercial HVAC & Climate Control",
    icon: SnowflakeIcon,
    accentColor: "#38bdf8",
    glowClass: "glow-card-cyan",
    badge: "HVAC Trade",
    exampleScenario: "Chiller compressor failure & refrigerant circuit pressure drops",
    slaBadge: "20 & 40-Min SLAs",
    description: "Rapid physical dispatch for industrial chillers, central air handling units, refrigerant circuits, and commercial ventilation systems.",
    capabilities: [
      "Central Chiller Plants & Cooling Towers",
      "Air Handling Units (AHU) & Fan Coil Units",
      "Emergency Refrigerant Balancing",
      "Ductwork & Airflow Diagnostics",
    ],
  },
  {
    id: "electrical",
    title: "High & Low Voltage Electrical Systems",
    icon: ZapIcon,
    accentColor: "#f59e0b",
    glowClass: "glow-card-amber",
    badge: "Electrical Trade",
    exampleScenario: "500 KVA Generator tripping & main switchgear voltage drop",
    slaBadge: "20 & 40-Min SLAs",
    description: "Licensed high-voltage electricians for commercial power distribution, transformer faults, industrial backup generators, and electrical safety switchgear.",
    capabilities: [
      "500+ KVA Backup Generator Overhauls",
      "Main Distribution Switchboards & Breakers",
      "Phase Balancing & Voltage Regulation",
      "Industrial UPS Backup Systems",
    ],
  },
  {
    id: "security",
    title: "CCTV, Access Control & Surveillance",
    icon: ShieldCheckIcon,
    accentColor: "#a855f7",
    glowClass: "glow-card-purple",
    badge: "Security Trade",
    exampleScenario: "Perimeter CCTV offline, NVR failure & biometric gate locks stuck",
    slaBadge: "20 & 40-Min SLAs",
    description: "Certified security technicians to restore optical and IP cameras, recording servers, biometric access locks, and automated perimeter barriers.",
    capabilities: [
      "IP Surveillance Cameras & NVR Servers",
      "Biometric Access Doors & Magnetic Locks",
      "Automated Boom Gates & Perimeter Barriers",
      "Emergency Security Alarm Verification",
    ],
  },
  {
    id: "it",
    title: "Enterprise IT & Core Network Hardware",
    icon: ServerIcon,
    accentColor: "#10b981",
    glowClass: "glow-card-emerald",
    badge: "Network Trade",
    exampleScenario: "Core switch reboot loop, rack fault & POS retail lines down",
    slaBadge: "20 & 40-Min SLAs",
    description: "Hardware and network engineers for enterprise switches, patch cabling, on-site server hardware rebooting, and cashier terminal communication lines.",
    capabilities: [
      "Core Network Switches & Managed Routers",
      "Server Rack Hardware & Power Distribution",
      "POS Cashier Network Infrastructure",
      "Fiber & Ethernet Trunk Diagnostics",
    ],
  },
  {
    id: "facility",
    title: "Commercial Facility & Structural Upkeep",
    icon: WrenchIcon,
    accentColor: "#f43f5e",
    glowClass: "glow-card-indigo",
    badge: "Facility Trade",
    exampleScenario: "Automatic glass entry door jam, plumbing mains & loading dock fault",
    slaBadge: "20 & 40-Min SLAs",
    description: "Comprehensive mechanical upkeep for commercial entry doors, plumbing mains, hydraulic loading docks, and interior building infrastructure.",
    capabilities: [
      "Automatic Glass Entry Doors & Sensors",
      "Commercial Water Supply & Plumbing Mains",
      "Hydraulic Loading Docks & Levelers",
      "Emergency Structural Mechanical Fitters",
    ],
  },
];

// ── Workflow Steps ───────────────────────────────────────────────────────
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
                ? "bg-[#10b981] text-[#06090e] dark:bg-[#10b981] dark:text-[#06090e] shadow-sm font-bold"
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
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#10b981] to-[#34d399] shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all duration-300"
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

  // Shared classes
  const borderColor = "border-[var(--border)]";

  return (
    <div
      className="relative min-h-screen font-sans selection:bg-[#10b981] selection:text-[#06090e]"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* ── Fixed Persistent Page Background ────────────────────────────── */}
      {/* Stays fixed behind content as user scrolls, allowing cards to glide over it */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: "url('/images/page-bg.jpg')",
          backgroundAttachment: "fixed",
        }}
        aria-hidden="true"
      >
        {/* Smoked glass tint layer ensuring high typography contrast */}
        <div className="absolute inset-0 bg-[#06090e]/82 dark:bg-[#06090e]/84 bg-[#f7f6f0]/90 backdrop-blur-[6px]" />
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
            {/* Logo + Brand */}
            <a href="#" className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none">
              <LogoMark size={32} />
              <div className="flex items-baseline gap-1">
                <span className="font-heading font-extrabold text-[17px] tracking-tight text-[var(--text-primary)]">VoltOps</span>
                <span className="text-[10px] font-bold text-[#10b981] dark:text-[#34d399]">●</span>
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
              className={`lg:hidden p-2 rounded-full border ${borderColor} text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
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
      {/* ── HERO SECTION (SYNERGEUS EDITORIAL ARCHITECTURE) ─────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden pt-12 pb-24 lg:pt-16 lg:pb-32 text-center">
        {/* Hero-specific background photo with seamless bottom gradient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-1">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35 dark:opacity-25"
            style={{
              backgroundImage: "url('/images/hero-nature.jpg')",
            }}
          />
          {/* Smooth bottom gradient fade into page */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-base)]/60 to-[var(--bg-base)]" />
        </div>

        {/* Atmospheric ambient bokeh & glow (Emerald + Mint + Warm Amber/Yellow Bokeh) */}
        <div className="hero-glow-blob-1 absolute top-0 left-1/2 -translate-x-1/2 w-[48rem] h-[34rem] rounded-full blur-[140px] pointer-events-none animate-ambient-drift" />
        <div className="hero-glow-blob-2 absolute top-1/4 left-1/4 w-[36rem] h-[28rem] rounded-full blur-[120px] pointer-events-none animate-ambient-drift-rev" />
        {/* Warm golden/yellow amber bokeh glow effect */}
        <div className="hero-glow-blob-3 absolute top-1/3 right-1/4 w-[32rem] h-[24rem] rounded-full blur-[110px] pointer-events-none animate-pulse-subtle" />

        {/* Soft grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
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
            VoltOps coordinates certified professionals across electrical, HVAC, security, IT,
            and facility upkeep — backed by guaranteed coverage windows, physical arrival SLAs,
            and human dispatcher oversight.
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
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all"
            >
              <CompassIcon size={15} className="text-[#10b981]" />
              <span>See How It Works</span>
            </a>
          </div>

          {/* ── 3-Element Elevated Centerpiece (Image 1 Customer-Facing Style) ─── */}
          <div className="mt-14 relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* Left Flanking Proof Card */}
            <div className="hidden lg:flex lg:col-span-3 flex-col justify-between text-left p-6 rounded-[28px] glass-panel glow-card-emerald">
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Nationally Recognized
                </span>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>5 Commercial Trades Covered</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>20 & 40-Min Physical SLAs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>100% Dispatcher Verified</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <span className="text-amber-400">★★★★★</span>
                  <span>4.9 / 5.0 Rating</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                  Trusted by 120+ commercial complexes, hospitals, and logistics hubs.
                </p>
              </div>
            </div>

            {/* Center Focal Card: Customer-Facing Operations Hub */}
            <div className="lg:col-span-6">
              <div
                className="rounded-[32px] border border-[var(--border-strong)] p-6 sm:p-7 text-left relative glass-panel glow-card-emerald shadow-[var(--shadow-float)] flex flex-col justify-between h-full"
                style={{
                  background: isDark
                    ? "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.14) 0%, rgba(14,20,29,0.85) 65%)"
                    : "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, rgba(255,255,255,0.92) 75%)",
                }}
              >
                {/* Header status bar */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      24/7 Verified Dispatch
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399] border border-[#10b981]/30">
                    Active Operations
                  </span>
                </div>

                {/* Main Card Title & Pitch */}
                <div className="space-y-2 mb-5">
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--text-primary)] leading-tight">
                    Guiding your{" "}
                    <span className="font-serif-italic font-normal">
                      facility operations
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Zero guesswork when critical equipment breaks down. Select any service sector to view immediate arrival readiness:
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
                            : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                        }`}
                      >
                        <SvgIcon size={13} className={isActive ? "text-[#06090e]" : "text-[var(--text-muted)]"} />
                        <span>{s.badge}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Trade Preview Box (Clean, customer-facing visual) */}
                <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-3 mb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${selectedTrade.accentColor}20`, color: selectedTrade.accentColor }}
                      >
                        <SelectedIcon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">{selectedTrade.title}</h4>
                        <span className="text-xs text-[var(--text-muted)] font-medium">
                          Common trigger: {selectedTrade.exampleScenario}
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
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon size={14} className="shrink-0" />
                      <span>Certified Trade Licences</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon size={14} className="shrink-0" />
                      <span>Human Desk Oversight</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Assurance Bar */}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
                  <span className="font-semibold text-[var(--text-secondary)]">
                    Need emergency dispatch right now?
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  Guaranteed Physical Arrival
                </span>
                <h4 className="text-base font-bold font-heading text-[var(--text-primary)]">
                  Physical presence, not just automated emails.
                </h4>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  VoltOps commits to qualified on-site arrival within 20 or 40 minutes across electrical, HVAC, security, IT, and facility upkeep.
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Priority SLA Window</span>
                  <span className="font-bold text-[#10b981] dark:text-[#34d399]">20 Minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Standard SLA Window</span>
                  <span className="font-bold text-[var(--text-primary)]">40 Minutes</span>
                </div>
                <a
                  href="#packages"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10b981] dark:text-[#34d399] hover:underline pt-2 block"
                >
                  <span>Compare Plan Response Times</span>
                  <ArrowRightIcon size={12} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── Section 2: Social Proof / Logos ─────────────────────────────── */}
      <section className="py-12 border-y border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-6">
            Trusted by facility managers across critical commercial sectors
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-80 grayscale hover:grayscale-0 transition-all text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-2"><BuildingIcon size={16} /> Commercial Real Estate</span>
            <span className="flex items-center gap-2"><ServerIcon size={16} /> Data & Cloud Facilities</span>
            <span className="flex items-center gap-2"><ShieldCheckIcon size={16} /> Industrial Logistics</span>
            <span className="flex items-center gap-2"><ZapIcon size={16} /> Manufacturing Plants</span>
            <span className="flex items-center gap-2"><WrenchIcon size={16} /> Corporate Headquarters</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Section 3: The 5 Core Service Sectors (Image 2 & 3 Card Look) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="services" className="py-24 max-w-6xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
            Specialized Trades
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Our five core{" "}
            <span className="font-serif-italic font-normal">
              service sectors
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Clear, transparent commercial trade coverage. Solve breakdowns quickly with verified licensed professionals on standby.
          </p>
        </div>

        {/* 5 Core Service Cards Grid (Image 2 & 3 Translucent Smoked Glass Aesthetic) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {CORE_SERVICES.map((trade, idx) => {
            const TradeIcon = trade.icon;
            // Span 2 columns on bottom row for balanced layout if 5 cards
            const isWide = idx >= 3;
            return (
              <div
                key={trade.id}
                className={`p-7 rounded-[32px] border border-[var(--border)] glass-panel ${trade.glowClass} flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] ${
                  isWide ? "lg:col-span-1.5" : ""
                }`}
              >
                <div className="space-y-5">
                  {/* Inner floating micro-card with scenario preview */}
                  <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-2.5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${trade.accentColor}25`, color: trade.accentColor }}
                        >
                          <TradeIcon size={14} />
                        </div>
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">{trade.badge}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${trade.accentColor}20`,
                          color: trade.accentColor,
                        }}
                      >
                        {trade.slaBadge}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                      "{trade.exampleScenario}"
                    </p>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">
                      <span>{trade.title}</span>
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2.5">
                      {trade.description}
                    </p>
                  </div>

                  {/* Key Capabilities Checklist */}
                  <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Coverage Scope:
                    </span>
                    {trade.capabilities.map((cap) => (
                      <div key={cap} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 border-t border-[var(--border)] mt-6 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                  <span>Available on all 4 plans</span>
                  <a
                    href="#packages"
                    className="inline-flex items-center gap-1 font-bold text-[#10b981] dark:text-[#34d399] hover:underline"
                  >
                    <span>Select Coverage</span>
                    <ArrowRightIcon size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 4: Testimonials (Jewel-Tone Smoked Glass Cards) ─────── */}
      <section className="py-24 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
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
                quote: "When our central chiller failed at 2 PM, VoltOps had an engineer on site in 18 minutes. It saved our ground floor retail operations.",
                author: "Tarek Mansoor",
                role: "Operations Director · Apex Retail",
                glow: "glow-card-cyan",
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
                className={`p-6 rounded-[28px] border border-[var(--border)] glass-panel ${glow} flex flex-col justify-between hover:-translate-y-1 transition-all shadow-[var(--shadow-sm)]`}
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
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
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
          <div className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel glow-card-emerald space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Facility Health</span>
                <div className="text-2xl font-extrabold font-heading text-[var(--text-primary)] mt-1">99.8% Uptime</div>
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
          <div className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold font-heading text-base text-[var(--text-primary)]">Candidate Audit Trail</h3>
                <span className="text-xs text-[var(--text-muted)]">Live match breakdown — Work Order Review</span>
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
                  <span className="font-bold text-sm text-[var(--text-primary)]">Tanvir Hasan</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  91% Match
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Certified CCTV & NVR Specialist · Tejgaon · 0 active jobs</p>
              <div className="flex gap-3 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span>✓ Safety Cert</span><span>✓ Free Now</span><span>✓ 2.1 km away</span>
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
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
                  className={`p-5 rounded-[28px] border border-[var(--border)] glass-panel transition-all duration-200 cursor-default ${
                    isHov ? "-translate-y-2 border-[#10b981] shadow-[var(--shadow-md)]" : ""
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all"
                    style={{
                      background: isHov ? "#10b981" : "var(--bg-surface-2)",
                      color: isHov ? "#06090e" : "var(--text-primary)",
                    }}
                  >
                    <StepIcon size={20} />
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399] mb-1">
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
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
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
          <ClockIcon size={18} className="shrink-0 text-[#10b981] mt-0.5" />
          <div className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">What does "arrival SLA" mean?</strong>{" "}
            The assigned technician physically arrives at your facility within the stated window — not merely an email acknowledgement.
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">

          {/* Plan A: 8-Hour Daily */}
          <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel flex flex-col justify-between hover:-translate-y-1 transition-all">
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
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border border-[var(--border)] hover:border-[#10b981] hover:text-[#10b981] transition-colors"
            >
              Select Plan A
            </button>
          </div>

          {/* Plan B: 24/7 Standard */}
          <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel glow-card-emerald flex flex-col justify-between hover:-translate-y-1 transition-all">
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
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border border-[var(--border)] hover:border-[#10b981] hover:text-[#10b981] transition-colors"
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
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">24/7 Priority</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399] border border-[#10b981]/40">
                  Plan C
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">For time-critical facilities</p>

              <div className="py-4 border-y border-[var(--border)]">
                <div className="text-lg font-extrabold font-heading text-[var(--text-primary)]">Pricing to be announced</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">24/7 · 2× faster arrival SLA</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-[#10b981]/40 bg-[#10b981]/10">
                <span className="text-xs font-semibold text-[#10b981] dark:text-[#34d399] block">Arrival SLA commitment:</span>
                <span className="text-xl font-extrabold font-heading text-[var(--text-primary)]">Within 20 minutes on site</span>
              </div>

              <ul className="space-y-2 text-xs">
                {["20-min rapid arrival (2× faster)", "Top-tier emergency dispatcher priority", "Full asset service history & preventative alerts"].map((b, i) => (
                  <li key={b} className={`flex items-center gap-2 ${i === 0 ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
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
              className="mt-6 w-full py-3 rounded-full font-semibold text-xs border-2 border-[#10b981] text-[var(--text-primary)] hover:bg-[#10b981] hover:text-[#06090e] transition-all"
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
                    <th className="py-4 px-5 font-bold text-[#10b981] dark:text-[#34d399]">Plan C · 24/7 Priority</th>
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
                      <td className="py-3.5 px-5 font-bold text-[#10b981] dark:text-[#34d399]">{c}</td>
                      <td className="py-3.5 px-5 text-[var(--text-muted)]">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 8: Role Workspaces (Image 2 & 3 Card Look) ─────────── */}
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
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
              <div key={title} className="p-5 rounded-2xl border border-[var(--border)] glass-panel space-y-1 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                  <CheckCircleIcon size={16} className="text-[#10b981] dark:text-[#34d399] shrink-0" />
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
            className="p-8 sm:p-12 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 glass-panel glow-card-emerald mb-16 border border-[#10b981]/40"
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
                  <div key={label} className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-[var(--border)] glass-panel shadow-[var(--shadow-sm)]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399] shrink-0">
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
              <div className="p-7 rounded-[32px] border border-[var(--border)] glass-panel shadow-[var(--shadow-sm)]">
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
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
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
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
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
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
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
