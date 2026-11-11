import { useState, useEffect, useRef, FormEvent, FC } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { CANONICAL_SERVICE_CATEGORIES, ServiceCategory } from "../types";
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
  ArrowRightIcon,
  BuildingIcon,
  AlertTriangleIcon,
  RadioIcon,
  MailIcon,
  PhoneIcon,
  LaptopIcon,
} from "../components/Icons";

// ── Service Category Card Specification ─────────────────────────────────
interface CanonicalServiceCard {
  category: ServiceCategory;
  shortTitle: string;
  icon: FC<IconProps>;
  accentColor: string;
  description: string;
  keyAssets: string[];
}

const CANONICAL_SERVICES: CanonicalServiceCard[] = [
  {
    category: "Electrical and power systems",
    shortTitle: "Electrical & Power",
    icon: ZapIcon,
    accentColor: "#f59e0b",
    description: "Standby generators, industrial switchgear, ATS units, and high-voltage power distribution.",
    keyAssets: ["Generators & ATS", "High-Voltage Panels", "Substation Feeders"],
  },
  {
    category: "AC, HVAC, and cooling",
    shortTitle: "AC, HVAC & Cooling",
    icon: SnowflakeIcon,
    accentColor: "#38bdf8",
    description: "Central chillers, cooling towers, rooftop air handlers, and commercial refrigeration units.",
    keyAssets: ["Central Chillers", "Refrigerant Systems", "Air Handling Units"],
  },
  {
    category: "CCTV and security",
    shortTitle: "CCTV & Security",
    icon: ShieldCheckIcon,
    accentColor: "#10b981",
    description: "IP surveillance cameras, 32-channel NVRs, access control barriers, and perimeter intrusion alarms.",
    keyAssets: ["PoE NVR Systems", "Access Control Gates", "Perimeter Sensors"],
  },
  {
    category: "Internet, networking, and hardware",
    shortTitle: "Networking & Hardware",
    icon: ServerIcon,
    accentColor: "#818cf8",
    description: "Enterprise fiber switches, structured Cat6 cabling, server racks, and network hardware.",
    keyAssets: ["Core Fiber Switches", "Server Racks", "Structured Cabling"],
  },
  {
    category: "IT and software support",
    shortTitle: "IT & Software Support",
    icon: LaptopIcon,
    accentColor: "#a855f7",
    description: "Workstation maintenance, operating system deployment, endpoint diagnostics, and software support.",
    keyAssets: ["Diagnostic Audits", "Workstation Fleets", "System Configurations"],
  },
  {
    category: "Plumbing and water systems",
    shortTitle: "Plumbing & Water",
    icon: WrenchIcon,
    accentColor: "#06b6d4",
    description: "Commercial booster pumps, supply lines, pressure relief valves, and backflow preventers.",
    keyAssets: ["Booster Water Pumps", "Pressure Regulators", "Main Valve Manifolds"],
  },
  {
    category: "Facility maintenance",
    shortTitle: "Facility Maintenance",
    icon: BuildingIcon,
    accentColor: "#64748b",
    description: "Structural fixtures, emergency exit lighting, fire suppression access, and building repairs.",
    keyAssets: ["Emergency Lighting", "Fire Door Interlocks", "Structural Hardware"],
  },
];

// ── Coverage Plan Specification ──────────────────────────────────────────
interface CoveragePlan {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  popular?: boolean;
  operationalWindow: string;
  arrivalSla: string | null;
  slaDescription: string;
  features: string[];
}

const COVERAGE_PLANS: CoveragePlan[] = [
  {
    id: "plan-a",
    name: "8-Hour Daily Coverage",
    badge: "Plan A",
    badgeColor: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    operationalWindow: "08:00 – 16:00 Daily Operations",
    arrivalSla: null,
    slaDescription: "Scheduled dispatch window; no physical arrival SLA commitment.",
    features: [
      "Access to all 7 canonical service trades",
      "Standard business-hour technician dispatch",
      "Digital work order tracking & audit trail",
      "Deterministic itemized invoicing preview",
    ],
  },
  {
    id: "plan-b",
    name: "24/7 Standard Coverage",
    badge: "Plan B",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    operationalWindow: "Round-the-clock 24/7/365 coverage",
    arrivalSla: "40-Minute Arrival SLA",
    slaDescription: "Physical arrival of a certified technician on site within 40 minutes.",
    features: [
      "24/7 commercial emergency hotline",
      "Guaranteed 40-minute physical on-site arrival",
      "Branch proximity dispatch from 3 regional hubs",
      "Digital customer sign-off & verified licensing",
    ],
  },
  {
    id: "plan-c",
    name: "24/7 Priority Coverage",
    badge: "Plan C · Mission Critical",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    popular: true,
    operationalWindow: "Round-the-clock priority dispatch",
    arrivalSla: "20-Minute Rapid Arrival SLA",
    slaDescription: "2× faster physical arrival of certified specialists on site within 20 minutes.",
    features: [
      "Highest priority dispatch queue",
      "Guaranteed 20-minute physical arrival on site",
      "Dedicated standby lead technician per hub",
      "Real-time countdown timer & direct phone link",
      "Comprehensive facility breakdown coverage",
    ],
  },
  {
    id: "plan-d",
    name: "Custom Enterprise Coverage",
    badge: "Plan D · Multi-Facility",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    operationalWindow: "Bespoke shift & multi-site schedules",
    arrivalSla: null,
    slaDescription: "Negotiated coverage parameters; tailored terms with no invented price or SLA.",
    features: [
      "Multi-facility complex coordination",
      "Dedicated on-site embedded engineering crews",
      "Custom SLA parameters per asset classification",
      "Full API integration & consolidated compliance",
    ],
  },
];

export function LandingPage() {
  const { theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCategory, setFormCategory] = useState<string>(CANONICAL_SERVICE_CATEGORIES[0]);
  const [formNotes, setFormNotes] = useState("");

  // Scroll Progress and Sticky Navbar State
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      setScrolled(currentScroll > 20);
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => setContactSubmitted(false), 5000);
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors selection:bg-[#10b981] selection:text-[#06090e]">
      {/* ── Top-Edge Scroll Progress Indicator (Phase 5 Motion) ────────── */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      {/* ── Persistent Hero Technician Visual Background (Phase 4A) ─────── */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-right sm:bg-center transition-opacity duration-700"
        style={{
          backgroundImage: "url('/images/hero-technician.jpg')",
          backgroundAttachment: "fixed",
          backgroundPosition: "right 20% center",
        }}
        aria-hidden="true"
      >
        {/* Accessible contrast overlay: light theme cleanses for high contrast text; dark theme deepens slate */}
        <div className="absolute inset-0 bg-[#f8fafc]/80 dark:bg-[#0b1117]/88 backdrop-blur-[2px] transition-colors" />
      </div>

      {/* ── Floating Navigation Pill (Phase 4B Theme Toggle Included) ───── */}
      <header className="sticky top-4 z-40 px-4 sm:px-6 max-w-6xl mx-auto">
        <nav
          className={`rounded-full border border-[var(--border)] px-4 py-2 transition-all duration-300 ${
            scrolled
              ? "backdrop-blur-xl bg-[var(--bg-surface)]/90 shadow-[var(--shadow-md)]"
              : "backdrop-blur-lg bg-[var(--bg-surface)]/80 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-[#10b981] flex items-center justify-center font-extrabold shadow-sm">
                <ZapIcon size={16} className="text-[#06090e]" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-base tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
                  VoltOps
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)]">
              {[
                ["#services", "Services"],
                ["#workflow", "Operations"],
                ["#plans", "Coverage Plans"],
                ["#hubs", "Regional Hubs"],
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

            {/* Desktop Action Controls */}
            <div className="hidden sm:flex items-center gap-2.5">
              <ThemeToggle showLabel={false} />
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
              >
                Sign In
              </Link>
              <a
                href="#plans"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] shadow-sm hover:bg-[#34d399] active:scale-95 transition-all"
              >
                <span>View Plans</span>
                <ArrowRightIcon size={11} />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex sm:hidden items-center gap-2">
              <ThemeToggle showLabel={false} />
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle navigation"
                className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
              >
                <span className="font-bold text-xs">{menuOpen ? "✕" : "☰"}</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {menuOpen && (
            <div className="sm:hidden pt-3 pb-2 border-t border-[var(--border)] mt-2 space-y-1 text-xs">
              {[
                ["#services", "Services (7 Canonical)"],
                ["#workflow", "Operations Workflow"],
                ["#plans", "Coverage Plans & SLAs"],
                ["#hubs", "Regional Hubs"],
                ["#contact", "Inquiry Form"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
                >
                  {label}
                </a>
              ))}
              <div className="pt-2 flex gap-2">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 rounded-lg font-bold border border-[var(--border)] text-[var(--text-primary)]"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ── Main Content Container ─────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-20 sm:space-y-28">
        {/* ── SECTION 1: HERO (Phase 4C Reduced Text & Phase 5 Motion) ─── */}
        <section className="relative pt-6 sm:pt-12 pb-6 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Commercial Field Service Platform</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[var(--text-primary)] leading-[1.15]">
            Commercial facility maintenance with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500">
              guaranteed physical arrival SLAs.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Connecting commercial facility managers with certified industrial technicians across 7 canonical service trades. Dispatched within minutes from regional hubs with real-time countdown telemetry.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#plans"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#10b981] text-[#06090e] shadow-md hover:bg-[#34d399] active:scale-95 transition-all"
            >
              <span>Explore Coverage Plans</span>
              <ArrowRightIcon size={14} />
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] active:scale-95 transition-all shadow-xs"
            >
              <span>Operations Portal</span>
            </Link>
          </div>

          {/* Trust Value Badges (Truthful, No Invented Numbers) */}
          <div className="pt-6 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
              <CheckCircleIcon size={15} className="text-emerald-500 shrink-0" />
              <span>7 Canonical Service Trades</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
              <ClockIcon size={15} className="text-cyan-500 shrink-0" />
              <span>20–40m Physical Arrival SLAs</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
              <ShieldCheckIcon size={15} className="text-purple-500 shrink-0" />
              <span>Deterministic Rates & Audit</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: CANONICAL SERVICE CATEGORIES (7 Trades) ────────── */}
        <section id="services" className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Coverage Capabilities
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
              Seven Canonical Service Trades
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
              Every work order, technician passport, and dispatch rule strictly conforms to our standardized commercial trades.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CANONICAL_SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.category}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xs hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                        style={{ backgroundColor: `${s.accentColor}18`, color: s.accentColor }}
                      >
                        <Icon size={17} />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                        Certified
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                      {s.shortTitle}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {s.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-1.5">
                    {s.keyAssets.map((asset) => (
                      <span
                        key={asset}
                        className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-secondary)] font-medium"
                      >
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 3: OPERATIONAL WORKFLOW ───────────────────────────── */}
        <section id="workflow" className="p-6 sm:p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Operational Lifecycle
            </span>
            <h2 className="font-heading font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
              How VoltOps Coordinates Commercial Field Service
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Breakdown Submitted",
                desc: "Facility manager logs service breakdown with asset classification, address, and target urgency.",
              },
              {
                step: "02",
                title: "Matching & Dispatch",
                desc: "Dispatcher evaluates arithmetic match score based on trade passport, branch proximity, and active load.",
              },
              {
                step: "03",
                title: "On-Site Physical Arrival",
                desc: "Technician transitions en route with live countdown telemetry; physical arrival logged on site.",
              },
              {
                step: "04",
                title: "Sign-Off & Invoice",
                desc: "On-site digital customer sign-off with itemized deterministic billing preview and audit ledger.",
              },
            ].map((st) => (
              <div key={st.step} className="p-4 rounded-xl bg-[var(--bg-surface-2)]/60 border border-[var(--border)] space-y-2">
                <span className="font-mono font-extrabold text-sm text-[#10b981]">{st.step}</span>
                <h4 className="font-heading font-bold text-sm text-[var(--text-primary)]">{st.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: COVERAGE PLANS & SLAS (Phase 4C) ────────────────── */}
        <section id="plans" className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Service Commitments
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
              Coverage Plans & Physical Arrival SLAs
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl">
              Arrival SLA strictly means physical arrival of a certified technician on site at your commercial facility — not email acknowledgment and not repair completion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COVERAGE_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`p-5 rounded-2xl border bg-[var(--bg-surface)] shadow-xs transition-all flex flex-col justify-between ${
                  plan.popular
                    ? "border-emerald-500 ring-1 ring-emerald-500/30"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                    {plan.popular && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        POPULAR
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{plan.operationalWindow}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Arrival Commitment
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)] block">
                      {plan.arrivalSla || "No Arrival SLA"}
                    </span>
                    <p className="text-[11px] text-[var(--text-secondary)]">{plan.slaDescription}</p>
                  </div>

                  <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircleIcon size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--border)]">
                  <a
                    href="#contact"
                    className={`block w-full py-2 rounded-xl text-center text-xs font-bold transition-all ${
                      plan.popular
                        ? "bg-[#10b981] text-[#06090e] hover:bg-[#34d399] shadow-xs"
                        : "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                    }`}
                  >
                    Request Coverage
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 5: REGIONAL HUBS ──────────────────────────────────── */}
        <section id="hubs" className="p-6 sm:p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Regional Operations
            </span>
            <h2 className="font-heading font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
              Strategic Dispatch Hubs
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
              Rapid physical response times are powered by permanently staffed operations hubs located near commercial corridors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: "EPZ Industrial Core Hub",
                location: "Sector 7, Export Processing Zone, Dhaka",
                trades: "Electrical & Power · Industrial HVAC",
              },
              {
                name: "Gazipur Industrial Zone Hub",
                location: "Central Logistics Corridor, Gazipur",
                trades: "Commercial Cooling · Plumbing Systems",
              },
              {
                name: "Tejgaon Commercial Core Hub",
                location: "Tejgaon Industrial & Commercial Area, Dhaka",
                trades: "CCTV & Security · IT Hardware Support",
              },
            ].map((hub) => (
              <div key={hub.name} className="p-4 rounded-xl bg-[var(--bg-surface-2)]/60 border border-[var(--border)] space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <MapPinIcon size={14} />
                  <span>Regional Hub</span>
                </div>
                <h4 className="font-heading font-bold text-sm text-[var(--text-primary)]">{hub.name}</h4>
                <p className="text-xs text-[var(--text-muted)]">{hub.location}</p>
                <div className="pt-2 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)]">
                  Primary: {hub.trades}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 6: CONTACT INQUIRY FORM ───────────────────────────── */}
        <section id="contact" className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Get Started
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
              Request Commercial Coverage
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              Submit your commercial facility inquiry for customized dispatch coordination.
            </p>
          </div>

          {contactSubmitted && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
              <CheckCircleIcon size={16} className="text-emerald-500 shrink-0" />
              <span>
                Demonstration inquiry recorded locally. In this frontend preview, live server dispatch is pending backend integration.
              </span>
            </div>
          )}

          <form
            onSubmit={handleContactSubmit}
            className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-md space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Tariq Rahman"
                  className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. trahman@company.com"
                  className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Facility Location</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. EPZ Zone, Gazipur, Tejgaon"
                  className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Target Service Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">Facility Requirements & Notes</label>
              <textarea
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Describe your equipment types, facility complexes, or dispatch schedule needs..."
                className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <p className="text-[11px] text-[var(--text-muted)] italic">
              * Demonstration mode: Submitted inquiries are demonstrated locally. Real facility dispatch requires verified contract sign-off.
            </p>

            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
                setTimeout(() => setContactSubmitted(false), 5000);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] shadow-sm hover:bg-[#34d399] active:scale-95 transition-all"
            >
              Submit Commercial Inquiry
            </button>
          </form>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-surface)] py-8 text-xs text-[var(--text-muted)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#10b981] flex items-center justify-center font-bold text-[#06090e] text-[10px]">
              VO
            </div>
            <span className="font-heading font-extrabold text-[var(--text-primary)]">VoltOps</span>
            <span>· B2B Commercial Field Service Coordination Platform</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/login" className="hover:text-[var(--text-primary)]">Operations Login</Link>
            <a href="#services" className="hover:text-[var(--text-primary)]">7 Trades</a>
            <a href="#plans" className="hover:text-[var(--text-primary)]">SLAs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
