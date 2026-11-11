import { useState, useEffect, FormEvent, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { ThemeToggle } from "../components/ThemeToggle";
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
  MailIcon,
  PhoneIcon,
  SettingsIcon,
  LaptopIcon,
} from "../components/Icons";

// ── Coverage Plan IDs ────────────────────────────────────────────────────
export type PlanId = "8hr" | "247-standard" | "247-priority" | "custom";

// ── 7 Canonical Commercial Service Trades ─────────────────────────────────
interface ServiceTrade {
  id: string;
  title: string;
  canonicalName: string;
  icon: FC<IconProps>;
  accentColor: string;
  glowClass: string;
  badge: string;
  slaBadge: string;
  shortDesc: string;
  capabilities: string[];
}

const CORE_SERVICES: ServiceTrade[] = [
  {
    id: "electrical",
    title: "Electrical & Power",
    canonicalName: "Electrical and power systems",
    icon: ZapIcon,
    accentColor: "#f59e0b",
    glowClass: "glow-card-amber",
    badge: "Electrical",
    slaBadge: "20–40 Min SLA",
    shortDesc: "Commercial electrical systems, switchgear, backup power, and distribution panels.",
    capabilities: ["Generators", "Switchgear", "Panels"],
  },
  {
    id: "hvac",
    title: "AC, HVAC & Cooling",
    canonicalName: "AC, HVAC, and cooling",
    icon: SnowflakeIcon,
    accentColor: "#38bdf8",
    glowClass: "glow-card-cyan",
    badge: "AC / HVAC",
    slaBadge: "20–40 Min SLA",
    shortDesc: "Central chillers, cooling towers, refrigerant systems, and air handling units.",
    capabilities: ["Chillers", "Cooling Plants", "Ventilation"],
  },
  {
    id: "security",
    title: "CCTV & Security",
    canonicalName: "CCTV and security",
    icon: ShieldCheckIcon,
    accentColor: "#a855f7",
    glowClass: "glow-card-purple",
    badge: "Security",
    slaBadge: "20–40 Min SLA",
    shortDesc: "Surveillance networks, biometric access control, perimeter sensors, and alarms.",
    capabilities: ["CCTV Networks", "Biometrics", "Access Gates"],
  },
  {
    id: "networking",
    title: "Networking & Hardware",
    canonicalName: "Internet, networking, and hardware",
    icon: ServerIcon,
    accentColor: "#10b981",
    glowClass: "glow-card-emerald",
    badge: "Networking",
    slaBadge: "20–40 Min SLA",
    shortDesc: "Enterprise server racks, managed switches, structured cabling, and fiber feeds.",
    capabilities: ["Server Racks", "Switches", "Fiber Lines"],
  },
  {
    id: "software",
    title: "IT & Software Support",
    canonicalName: "IT and software support",
    icon: LaptopIcon,
    accentColor: "#6366f1",
    glowClass: "glow-card-indigo",
    badge: "IT Support",
    slaBadge: "20–40 Min SLA",
    shortDesc: "On-site system recovery, POS hardware, network security, and terminal diagnostics.",
    capabilities: ["System Recovery", "POS Terminals", "Firewalls"],
  },
  {
    id: "plumbing",
    title: "Plumbing & Water Systems",
    canonicalName: "Plumbing and water systems",
    icon: WrenchIcon,
    accentColor: "#06b6d4",
    glowClass: "glow-card-cyan",
    badge: "Plumbing",
    slaBadge: "20–40 Min SLA",
    shortDesc: "Commercial water mains, pressure booster pumps, drainage lines, and valves.",
    capabilities: ["Booster Pumps", "Water Mains", "Valves & Drains"],
  },
  {
    id: "facility",
    title: "Facility Maintenance",
    canonicalName: "Facility maintenance",
    icon: BuildingIcon,
    accentColor: "#f43f5e",
    glowClass: "glow-card-amber",
    badge: "Facility",
    slaBadge: "20–40 Min SLA",
    shortDesc: "Automatic sliding doors, industrial roll-up shutters, and structural upkeep.",
    capabilities: ["Auto Doors", "Roll-Up Shutters", "Structural Upkeep"],
  },
];

// ── 5 Operational Workflow Steps (Concise, 10-14 words each) ──────────────
const WORKFLOW_STEPS = [
  { step: 1, icon: FileTextIcon, title: "Select Coverage", desc: "Choose a daily coverage window and physical arrival SLA commitment for your facility." },
  { step: 2, icon: AlertTriangleIcon, title: "Submit Request", desc: "Report the facility breakdown from your phone or portal for immediate dispatcher intake." },
  { step: 3, icon: CompassIcon, title: "Verified Matching", desc: "Dispatcher verifies candidate trade competency, license validity, and proximity score." },
  { step: 4, icon: ZapIcon, title: "Technician Arrives", desc: "Certified technician physically arrives at your facility within the guaranteed 20–40 minute window." },
  { step: 5, icon: CheckCircleIcon, title: "Digital Sign-Off", desc: "Inspect completed work on site, approve sign-off, and receive deterministic billing receipts." },
];

// ── 4 Role Workspaces (Concise, 1-2 lines each) ───────────────────────────
const ROLE_WORKSPACES = [
  { icon: BuildingIcon, title: "Commercial Customer", desc: "Submit breakdown requests, track technician arrival countdowns, and approve digital receipts.", glow: "glow-card-emerald" },
  { icon: RadioIcon, title: "Dispatcher Console", desc: "Review incoming requests, evaluate candidate match scores, and confirm certified assignments.", glow: "glow-card-amber" },
  { icon: WrenchIcon, title: "Field Technician", desc: "Manage active shift rosters, update job progression, and log on-site completion notes.", glow: "glow-card-cyan" },
  { icon: SettingsIcon, title: "Administrator", desc: "Govern staff accounts, verify technician skill passports, and audit operational event logs.", glow: "glow-card-indigo" },
];

// ── 3 Regional Coverage Hubs ─────────────────────────────────────────────
const REGIONAL_HUBS = [
  {
    name: "Dhaka Central Hub",
    coverage: "Motijheel · Tejgaon · Gulshan · Banani · Dhanmondi",
    desc: "Rapid response across commercial office towers, corporate headquarters, and retail complexes.",
    sla: "20–40 Min SLA",
  },
  {
    name: "EPZ Industrial Core",
    coverage: "Savar · Ashulia · Gazipur Industrial Clusters",
    desc: "Heavy-duty power, HVAC, and mechanical upkeep for manufacturing plants and export zones.",
    sla: "20–40 Min SLA",
  },
  {
    name: "Chittagong Port Hub",
    coverage: "Agrabad Commercial Area · Port Zone · Halishahar",
    desc: "Continuous service coordination for maritime logistics, cold storage, and port warehouses.",
    sla: "20–40 Min SLA",
  },
];

// ── Ambient Background Particles (Subtle, Performant Floating Specks) ─────
const AMBIENT_PARTICLES = [
  { id: 1, top: "12%", left: "15%", size: 4, duration: 16, delay: 0 },
  { id: 2, top: "28%", left: "82%", size: 5, duration: 20, delay: 2 },
  { id: 3, top: "45%", left: "22%", size: 3, duration: 18, delay: 4 },
  { id: 4, top: "62%", left: "75%", size: 4, duration: 22, delay: 1 },
  { id: 5, top: "78%", left: "35%", size: 5, duration: 19, delay: 3 },
  { id: 6, top: "88%", left: "68%", size: 3, duration: 17, delay: 5 },
];

// ── Logo Mark with Framer Motion Micro-Interaction ───────────────────────
function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <motion.div
      whileHover={{ scale: 1.08, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] shadow-[0_0_20px_rgba(16,185,129,0.45)] cursor-pointer overflow-hidden group shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent rotate-45 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      <span className="absolute inset-0 rounded-2xl border border-white/30 opacity-70 animate-pulse" />
      <ZapIcon size={Math.round(size * 0.52)} className="relative text-white drop-shadow transition-transform duration-200 group-hover:scale-110" />
    </motion.div>
  );
}

// ── Check Icon ───────────────────────────────────────────────────────────
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-3.5 h-3.5 shrink-0 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

// ── Main Landing Page Component ──────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const shouldReduceMotion = useReducedMotion();

  // Scroll progress with smooth spring
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Page title
  useEffect(() => {
    document.title = "VoltOps | Commercial Field Service & Emergency Technician Coordination";
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
  const [heroActiveTrade, setHeroActiveTrade] = useState<string>("electrical");
  const selectedTrade = CORE_SERVICES.find((s) => s.id === heroActiveTrade) || CORE_SERVICES[0];
  const SelectedIcon = selectedTrade.icon;

  // Workflow step hover state
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Plan comparison expand state
  const [showMatrix, setShowMatrix] = useState(false);

  // Contact form state
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

  // Framer Motion Variants
  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.09,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const heroItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const sectionContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const borderColor = "border-[var(--border)]";

  return (
    <div
      className="relative min-h-screen font-sans selection:bg-[#10b981] selection:text-[#06090e] overflow-x-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* ── Top-Edge Scroll Progress Indicator (Framer Motion Spring) ───── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#10b981] via-[#34d399] to-[#38bdf8] origin-left z-[100]"
        style={{ scaleX }}
        aria-hidden="true"
      />

      {/* ── Persistent Fixed Background (New Industrial Field-Service Photograph) ── */}
      <div
        className="fixed inset-0 pointer-events-none -z-20 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: "url('/images/hero-technician.jpg')",
          backgroundAttachment: "fixed",
          backgroundPosition: "center 25%",
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[#f7f6f0]/82 dark:bg-[#06090e]/88 backdrop-blur-[2px] dark:backdrop-blur-[5px]" />
      </div>

      {/* ── Continuous Ambient Animated Glow Mesh & Floating Light Particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        {/* Animated Emerald Ambient Glow Source 1 */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 30, -20, 0],
                  y: [0, -25, 15, 0],
                  opacity: isDark ? [0.22, 0.35, 0.22] : [0.12, 0.22, 0.12],
                }
          }
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 left-1/4 w-[46rem] h-[34rem] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)" }}
        />

        {/* Animated Teal Ambient Glow Source 2 */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, -35, 25, 0],
                  y: [0, 20, -30, 0],
                  opacity: isDark ? [0.18, 0.30, 0.18] : [0.10, 0.18, 0.10],
                }
          }
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 right-10 w-[38rem] h-[30rem] rounded-full blur-[130px]"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.28) 0%, transparent 70%)" }}
        />

        {/* Animated Amber Warm Glow Source 3 */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 20, -15, 0],
                  y: [0, -15, 20, 0],
                  opacity: isDark ? [0.12, 0.22, 0.12] : [0.08, 0.15, 0.08],
                }
          }
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-2/3 left-10 w-[32rem] h-[26rem] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)" }}
        />

        {/* Floating Ambient Light Specks / Particles */}
        {!shouldReduceMotion &&
          AMBIENT_PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              animate={{
                y: [0, -40, 0],
                opacity: [0.15, 0.45, 0.15],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "easeInOut",
              }}
              className="absolute rounded-full bg-emerald-400 dark:bg-emerald-300 blur-[0.5px]"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
              }}
            />
          ))}
      </div>

      {/* ── Floating Pill Navigation (Accessible & Responsive) ─────────── */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 max-w-6xl mx-auto">
        <nav
          className={`rounded-full border ${borderColor} px-4 py-2.5 transition-all duration-300 ${
            scrolled
              ? "backdrop-blur-2xl shadow-[var(--shadow-md)] bg-[var(--bg-overlay)]"
              : "backdrop-blur-xl bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo Mark with Motion Interaction */}
            <a href="#" className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none">
              <LogoMark size={32} />
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-[17px] tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
                  VoltOps
                </span>
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
                ["#hubs", "Coverage Hubs"],
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

            {/* Desktop Right Actions with Pure Light/Dark Icon Toggle */}
            <div className="hidden lg:flex items-center gap-2.5">
              <ThemeToggle />
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)] transition-all"
              >
                Sign in
              </Link>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href="#packages"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-[#34d399] transition-all group"
              >
                <span>Choose Plan</span>
                <ArrowRightIcon size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </motion.a>
            </div>

            {/* Mobile Toggle */}
            <div className="lg:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-full border ${borderColor} text-slate-700 dark:text-slate-300 hover:text-[var(--text-primary)]`}
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
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className={`lg:hidden pt-4 pb-2 border-t mt-3 ${borderColor} space-y-2`}>
              {[
                ["#services", "Services"],
                ["#dispatch", "Operations"],
                ["#how", "How It Works"],
                ["#packages", "Plans"],
                ["#hubs", "Coverage Hubs"],
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
      {/* ── HERO SECTION: INDUSTRIAL MAINTENANCE PHOTOGRAPHY & ENTRANCE ─── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 text-center">
        {/* Hero Background Layer: Looping Cinematic Slow-Motion Video with Dark CSS Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-1">
          {/* Highly compressed looping 16:9 video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/images/hero-technician.jpg"
            className="absolute inset-0 w-full h-full object-cover object-center"
          >
            <source src="/videos/hero-background.mp4" type="video/mp4" />
            <source src="/videos/hero-background.webm" type="video/webm" />
            <img
              src="/images/hero-technician.jpg"
              alt="Commercial Field Service Operations"
              className="w-full h-full object-cover object-center"
            />
          </video>

          {/* Dark CSS Overlay directly over video layer for 100% text readability & vibrant accent pop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.70)" }}
          />

          {/* Bottom fade into base theme background */}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-[var(--bg-base)]" />
        </div>

        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative max-w-6xl mx-auto px-5"
        >
          {/* Editorial Headline with Word/Line Stagger */}
          <motion.h1
            variants={heroItemVariants}
            className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-[66px] tracking-tight leading-[1.08] text-white max-w-4xl mx-auto drop-shadow-md"
          >
            Our platform simplifies your{" "}
            <span className="font-serif-italic font-normal text-emerald-300">
              facility operations
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={heroItemVariants}
            className="text-base sm:text-lg lg:text-xl font-heading font-medium text-slate-200 max-w-2xl mx-auto leading-relaxed mt-4 tracking-tight drop-shadow-sm"
          >
            One unified subscription for commercial facility maintenance — certified technicians dispatched with guaranteed arrival in{" "}
            <span className="font-bold text-[#34d399] underline decoration-emerald-500/50 underline-offset-4">
              20 to 40 minutes
            </span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={heroItemVariants}
            className="flex flex-wrap items-center justify-center gap-3.5 pt-6"
          >
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#packages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm bg-[#10b981] text-[#06090e] shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:bg-[#34d399] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] transition-all group"
            >
              <span>Explore Coverage Plans</span>
              <ArrowRightIcon size={15} className="group-hover:translate-x-1 transition-transform" />
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="#how"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-white/20 text-white hover:text-white bg-white/10 hover:bg-white/15 backdrop-blur-xl transition-all"
            >
              <CompassIcon size={15} className="text-[#34d399]" />
              <span>See How It Works</span>
            </motion.a>
          </motion.div>

          {/* ── 3-Card Centerpiece Spotlight ────────────────────────────── */}
          <motion.div
            variants={heroItemVariants}
            className="mt-12 relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
          >
            {/* Left Card: Service Standards */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:flex lg:col-span-3 flex-col justify-between text-left p-6 rounded-[28px] glass-panel glow-card-emerald"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Service Standards
                </span>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>7 Canonical Trades</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>20 & 40-Min Physical SLAs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>Verified Skill Passports</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>Human Dispatcher Review</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-3.5 mt-3 space-y-0.5">
                <div className="text-xs font-bold text-emerald-700 dark:text-[#34d399]">
                  Verified Workforce Roster
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Trade licenses and safety credentials checked before dispatch.
                </p>
              </div>
            </motion.div>

            {/* Center Card: Interactive Breakdown Trade Selector */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="lg:col-span-6"
            >
              <div
                className="rounded-[32px] border border-[var(--border-strong)] p-6 sm:p-7 text-left relative glass-panel glow-card-emerald shadow-[var(--shadow-float)] flex flex-col justify-between h-full"
                style={{
                  background: isDark
                    ? "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.14) 0%, rgba(14,20,29,0.85) 65%)"
                    : "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, rgba(255,255,255,0.95) 75%)",
                }}
              >
                {/* Header status bar */}
                <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Commercial Dispatch Center
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399] border border-[#10b981]/30">
                    Active Operations
                  </span>
                </div>

                {/* Main Card Title */}
                <div className="space-y-1 mb-3">
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
                    Immediate help for{" "}
                    <span className="font-serif-italic font-normal">
                      facility breakdowns
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Select a trade to view response times:
                  </p>
                </div>

                {/* 7-Trade Selector Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3.5 border-b border-[var(--border)] no-scrollbar">
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

                {/* Selected Trade Preview Box */}
                <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-3 mb-3.5">
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
                          {selectedTrade.shortDesc}
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

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon size={14} className="shrink-0" />
                      <span>Certified Technicians</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircleIcon size={14} className="shrink-0" />
                      <span>Guaranteed Physical Arrival</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Assurance Bar */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Need emergency repair coverage?
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
            </motion.div>

            {/* Right Card: Arrival SLA Commitment */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:flex lg:col-span-3 flex-col justify-between text-left p-6 rounded-[28px] glass-panel glow-card-amber"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Arrival SLA Commitment
                </span>
                <h4 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                  Physical presence on site.
                </h4>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  Arrival SLA guarantees a certified technician is physically at your facility door, not an email acknowledgment.
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-3.5 mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Plan C (Priority)</span>
                  <span className="font-bold text-[#10b981] dark:text-[#34d399]">20 Minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Plan B (Standard)</span>
                  <span className="font-bold text-slate-900 dark:text-white">40 Minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Plan A (Daily)</span>
                  <span className="font-medium text-slate-500">8h Daily Window</span>
                </div>
                <a
                  href="#packages"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10b981] dark:text-[#34d399] hover:underline pt-1.5 block"
                >
                  <span>Compare Plans</span>
                  <ArrowRightIcon size={12} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Section: The 7 Canonical Service Trades (BALANCED & CENTERED) ─ */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section id="services" className="py-20 max-w-6xl mx-auto px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionContainerVariants}
          className="text-center max-w-2xl mx-auto space-y-2.5 mb-14"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
            7 Supported Trades
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            What we maintain for your{" "}
            <span className="font-serif-italic font-normal">
              facility
            </span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Standardized commercial coverage across 7 technical trades with 20–40 minute physical arrival targets.
          </p>
        </motion.div>

        {/* 7 Core Service Cards: Row 1 has 4 cards, Row 2 has 3 cards centered */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionContainerVariants}
          className="flex flex-wrap justify-center gap-6 items-stretch"
        >
          {CORE_SERVICES.map((trade) => {
            const TradeIcon = trade.icon;
            return (
              <motion.div
                key={trade.id}
                variants={cardItemVariants}
                whileHover={{ y: -6, scale: 1.015 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] flex flex-col"
              >
                <div
                  className={`h-full p-6 rounded-[28px] border border-[var(--border)] glass-panel ${trade.glowClass} flex flex-col justify-between text-center shadow-[var(--shadow-sm)] group`}
                >
                  <div className="flex flex-col items-center text-center w-full space-y-3">
                    {/* Trade Icon */}
                    <motion.div
                      whileHover={{ scale: 1.12, rotate: 2 }}
                      transition={{ duration: 0.2 }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm p-2.5"
                      style={{
                        backgroundColor: `${trade.accentColor}18`,
                        color: trade.accentColor,
                        border: `1px solid ${trade.accentColor}35`,
                      }}
                    >
                      <TradeIcon size={22} />
                    </motion.div>

                    {/* SLA Badge */}
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border mx-auto"
                      style={{
                        borderColor: `${trade.accentColor}40`,
                        color: trade.accentColor,
                        backgroundColor: `${trade.accentColor}12`,
                      }}
                    >
                      {trade.slaBadge}
                    </span>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold font-service-title text-[var(--text-primary)]">
                      {trade.title}
                    </h3>

                    {/* Concise 1-Sentence Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 text-center leading-relaxed font-normal min-h-[36px]">
                      {trade.shortDesc}
                    </p>

                    {/* 3 Compact Capability Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 w-full">
                      {trade.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface-2)] text-slate-700 dark:text-slate-300 border border-[var(--border)]"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Clean Simple CTA */}
                  <div className="pt-3.5 border-t border-[var(--border)] mt-4 w-full">
                    <a
                      href="#packages"
                      className="w-full py-1.5 rounded-full text-xs font-semibold text-center border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:border-[#10b981] hover:text-[#06090e] hover:bg-[#10b981] transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>View Plans</span>
                      <ArrowRightIcon size={11} />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Section: Operations & Matching Engine Audit Trail ──────────── */}
      <section id="dispatch" className="py-20 max-w-6xl mx-auto px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionContainerVariants}
          className="text-center max-w-xl mx-auto space-y-2.5 mb-14"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
            Dispatch Coordination
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)]">
            Transparent matching{" "}
            <span className="font-serif-italic font-normal">
              & audit trail
            </span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Deterministic matching based on trade skills, certifications, and proximity. Final dispatch confirmed by human operations desk.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionContainerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* Left Bento: Operations Dispatch Architecture */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel glow-card-emerald space-y-5"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Dispatch Architecture</span>
                <div className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white mt-0.5">Deterministic Matching</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399]">
                Advisory AI + Human
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: "Trade Skill & License Verification", val: "Hard eligibility gate", progress: 100, color: "#10b981" },
                { label: "Proximity & Hub Routing", val: "Branch hub proximity score", progress: 85, color: "#34d399" },
                { label: "Active Workload Balancing", val: "Max 2 active jobs per tech", progress: 75, color: "#38bdf8" },
              ].map(({ label, val, progress, color }) => (
                <div key={label} className="p-3.5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-900 dark:text-white">{label}</span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">{val}</span>
                  </div>
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-[var(--border)]">
              VoltOps strictly requires human dispatcher confirmation for all job assignments. Automated engines provide transparent scoring and candidate explanations only.
            </p>
          </motion.div>

          {/* Right Bento: Candidate Audit Evaluation */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel space-y-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold font-heading text-base text-slate-900 dark:text-white">Matching Engine Audit</h3>
                <span className="text-xs text-slate-600 dark:text-slate-400">Live candidate ranking preview</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399] border border-[var(--border)]">
                Verified Roster
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
                  91% Match Score
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">Certified CCTV & NVR Specialist · Tejgaon Hub · 0 active jobs</p>
              <div className="flex gap-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span>✓ Active License</span><span>✓ Standby Available</span><span>✓ 2.1 km away</span>
              </div>
            </div>

            {/* 2nd Match */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Mehedi Zaman</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  78% Match Score
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Security Tech · 1 active job in Banani</p>
            </div>

            {/* Ineligible */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] opacity-70">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-600 dark:text-slate-400">Nayeem Islam</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                  Disqualified
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">✕ Trade license expired (filtered by hard rule)</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Section: How It Works (CONCISE 5-STEP PROCESS) ─────────────── */}
      <section id="how" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="text-center max-w-xl mx-auto space-y-2.5 mb-14"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Coordination Workflow
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
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            {WORKFLOW_STEPS.map(({ step, icon: StepIcon, title, desc }) => {
              const isHov = hoveredStep === step;
              return (
                <motion.div
                  key={step}
                  variants={cardItemVariants}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredStep(step)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onFocus={() => setHoveredStep(step)}
                  onBlur={() => setHoveredStep(null)}
                  className={`p-5 rounded-[26px] border border-[var(--border)] glass-panel transition-all duration-200 cursor-default ${
                    isHov ? "border-[#10b981] shadow-[var(--shadow-md)]" : ""
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3.5 transition-all shadow-sm"
                    style={{
                      background: isHov ? "#10b981" : "var(--bg-surface-2)",
                      color: isHov ? "#06090e" : "var(--text-primary)",
                    }}
                  >
                    <StepIcon size={19} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#34d399] mb-1">
                    Step 0{step}
                  </div>
                  <h3 className="font-bold font-heading text-sm text-[var(--text-primary)] mb-1.5">{title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">{desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Section: Subscription Coverage Plans (CONCISE & ACCURATE) ──── */}
      <section id="packages" className="py-20 max-w-6xl mx-auto px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionContainerVariants}
          className="text-center max-w-2xl mx-auto space-y-2.5 mb-8"
        >
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
            All plans include qualified coordination across all seven service trades.
          </p>
        </motion.div>

        {/* SLA Clarification Banner */}
        <div
          className="max-w-2xl mx-auto mb-10 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 glass-panel"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <ClockIcon size={18} className="shrink-0 text-[#10b981] mt-0.5" />
          <div className="text-slate-800 dark:text-slate-200">
            <strong className="text-slate-900 dark:text-white">Physical Arrival SLA:</strong>{" "}
            Guarantees certified technician presence physically on site at your facility within the stated window — not email acknowledgment and not repair completion.
          </div>
        </div>

        {/* 4 Plan Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={sectionContainerVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch"
        >
          {/* Plan A: 8-Hour Daily */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col"
          >
            <div className="h-full p-6 sm:p-7 rounded-[30px] border border-[var(--border)] glass-panel flex flex-col justify-between shadow-[var(--shadow-sm)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-card-title text-slate-900 dark:text-white">8-Hour Daily</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[var(--border)] text-slate-600 dark:text-slate-400">
                    Plan A
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Standard business operational window</p>

                <div className="py-3 border-y border-[var(--border)]">
                  <div className="text-base font-extrabold font-heading text-slate-900 dark:text-white">Pricing upon request</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">08:00 – 16:00 operational window</div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Arrival SLA commitment:</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No physical arrival SLA</span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  {["All 7 technical trades covered", "Scheduled daytime repairs", "Human dispatcher assignment"].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <CheckIcon className="text-emerald-500" />{b}
                    </li>
                  ))}
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handlePlan("8hr")}
                className="mt-6 w-full py-2.5 rounded-full font-semibold text-xs border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:border-[#10b981] hover:text-[#10b981] transition-colors"
              >
                Select Plan A
              </motion.button>
            </div>
          </motion.div>

          {/* Plan B: 24/7 Standard */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col"
          >
            <div className="h-full p-6 sm:p-7 rounded-[30px] border border-[var(--border)] glass-panel glow-card-emerald flex flex-col justify-between shadow-[var(--shadow-sm)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-card-title text-slate-900 dark:text-white">24/7 Standard</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Plan B
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Round-the-clock facility coverage</p>

                <div className="py-3 border-y border-[var(--border)]">
                  <div className="text-base font-extrabold font-heading text-slate-900 dark:text-white">Pricing upon request</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">★ 24 hours · 7 days a week</div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Arrival SLA commitment:</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Within 40 minutes on site</span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  {["All 7 technical trades covered", "40-min physical arrival SLA", "Digital repair logs & receipts"].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <CheckIcon className="text-emerald-500" />{b}
                    </li>
                  ))}
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handlePlan("247-standard")}
                className="mt-6 w-full py-2.5 rounded-full font-semibold text-xs border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:border-[#10b981] hover:text-[#10b981] transition-colors"
              >
                Select Plan B
              </motion.button>
            </div>
          </motion.div>

          {/* Plan C: 24/7 Priority */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col"
          >
            <div className="h-full p-6 sm:p-7 rounded-[30px] border-2 border-[#10b981] glass-panel glow-card-emerald flex flex-col justify-between relative shadow-[0_0_32px_rgba(16,185,129,0.22)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-[#10b981] text-[#06090e] text-[11px] font-bold uppercase tracking-wider shadow flex items-center gap-1">
                <ZapIcon size={11} />
                <span>Fastest Response</span>
              </div>

              <div className="space-y-3 mt-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-card-title text-slate-900 dark:text-white">24/7 Priority</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#10b981]/20 text-[#10b981] dark:text-[#34d399] border border-[#10b981]/40">
                    Plan C
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Time-critical commercial complexes</p>

                <div className="py-3 border-y border-[var(--border)]">
                  <div className="text-base font-extrabold font-heading text-slate-900 dark:text-white">Pricing upon request</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">24/7 · 2× faster arrival SLA</div>
                </div>

                <div className="p-3 rounded-2xl border border-[#10b981]/40 bg-[#10b981]/10">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-[#34d399] block">Arrival SLA commitment:</span>
                  <span className="text-base font-extrabold font-heading text-slate-900 dark:text-white">Within 20 minutes on site</span>
                </div>

                <ul className="space-y-1.5 text-xs">
                  {["20-min rapid arrival (2× faster)", "Top emergency dispatch priority", "All 7 service trades covered"].map((b, i) => (
                    <li key={b} className={`flex items-center gap-2 ${i === 0 ? "font-bold text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"}`}>
                      <CheckIcon className="text-[#10b981]" />{b}
                    </li>
                  ))}
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handlePlan("247-priority")}
                className="mt-6 w-full py-2.5 rounded-full font-bold text-xs bg-[#10b981] text-[#06090e] shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-[#34d399] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Select Plan C</span>
                <ArrowRightIcon size={12} />
              </motion.button>
            </div>
          </motion.div>

          {/* Plan D: Custom Coverage */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col"
          >
            <div className="h-full p-6 sm:p-7 rounded-[30px] border border-[var(--border)] glass-panel flex flex-col justify-between shadow-[var(--shadow-sm)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-card-title text-slate-900 dark:text-white">Custom Coverage</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border border-[var(--border)] text-slate-600 dark:text-slate-400">
                    Plan D
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tailored enterprise shift schedules</p>

                <div className="py-3 border-y border-[var(--border)]">
                  <div className="text-base font-extrabold font-heading text-slate-900 dark:text-white">Negotiated Terms</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Bespoke shifts & SLA window</div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Example shifts:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">6, 8, 12, or 16 hours/day</span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Tailored schedule matching multi-facility shifts. SLAs and pricing confirmed after requirements review.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handlePlan("custom")}
                className="mt-6 w-full py-2.5 rounded-full font-semibold text-xs border-2 border-[#10b981] text-slate-900 dark:text-white hover:bg-[#10b981] hover:text-[#06090e] transition-all"
              >
                Discuss a Custom Plan →
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Expandable Comparison Matrix */}
        <div className="mt-10 text-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold border border-[var(--border)] text-slate-800 dark:text-slate-200 hover:text-[var(--text-primary)] bg-[var(--bg-surface)] backdrop-blur-xl transition-all"
          >
            {showMatrix ? "Hide Plan Comparison ▲" : "Compare All Plans ▼"}
          </motion.button>
        </div>

        {showMatrix && (
          <div className="mt-6 rounded-3xl border border-[var(--border)] overflow-hidden shadow-[var(--shadow-md)] glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)]">
                    <th className="py-3 px-4 font-semibold text-slate-900 dark:text-white">Coverage Dimension</th>
                    <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Plan A · 8-Hour</th>
                    <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Plan B · 24/7 Standard</th>
                    <th className="py-3 px-4 font-bold text-[#10b981] dark:text-[#34d399]">Plan C · 24/7 Priority</th>
                    <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Plan D · Custom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {[
                    ["Operational Window", "08:00 – 16:00 Daily", "24/7 Round-the-clock", "24/7 Priority", "Bespoke shift window"],
                    ["Physical Arrival SLA", "No physical arrival SLA", "40-minute arrival", "20-minute rapid arrival (2×)", "Negotiated terms"],
                    ["Technical Trades", "All 7 canonical trades", "All 7 canonical trades", "All 7 canonical trades", "All 7 canonical trades"],
                    ["Dispatcher Assignment", "Human dispatcher", "Human dispatcher", "Priority emergency queue", "Dedicated enterprise desk"],
                    ["Contract Pricing", "Pricing upon request", "Pricing upon request", "Pricing upon request", "Quoted after facility review"],
                  ].map(([feat, a, b, c, d]) => (
                    <tr key={feat as string}>
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{feat}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{a}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{b}</td>
                      <td className="py-2.5 px-4 font-bold text-[#10b981] dark:text-[#34d399]">{c}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section: Regional Coverage Hubs (CONCISE CARDS) ────────────── */}
      <section id="hubs" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="text-center max-w-xl mx-auto mb-12 space-y-2.5"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Regional Hubs
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[var(--text-primary)]">
              Operational coverage deployment
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Stationed regional dispatch teams maintaining 20–40 minute physical arrival targets across major commercial corridors.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {REGIONAL_HUBS.map((hub) => (
              <motion.div
                key={hub.name}
                variants={cardItemVariants}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <div className="h-full p-6 rounded-[28px] border border-[var(--border)] glass-panel flex flex-col justify-between shadow-[var(--shadow-sm)]">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399]">
                        <MapPinIcon size={19} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {hub.sla}
                      </span>
                    </div>
                    <h3 className="font-bold font-card-title text-base text-[var(--text-primary)]">{hub.name}</h3>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-[#34d399]">{hub.coverage}</div>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{hub.desc}</p>
                  </div>

                  <div className="pt-3.5 border-t border-[var(--border)] mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Status</span>
                    <span className="font-bold text-[#10b981] dark:text-[#34d399]">Active Standby Roster</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section: Role Workspaces (CONCISE 1-2 LINES EACH) ──────────── */}
      <section className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="text-center max-w-xl mx-auto mb-12 space-y-2.5"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Role Workspaces
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-[var(--text-primary)]">
              Tailored tools for every stakeholder
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {ROLE_WORKSPACES.map(({ icon: Icon, title, desc, glow }) => (
              <motion.div
                key={title}
                variants={cardItemVariants}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <div
                  className={`h-full p-6 rounded-[28px] border border-[var(--border)] glass-panel ${glow} shadow-[var(--shadow-sm)] flex flex-col justify-between`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-surface-2)] text-[#10b981] dark:text-[#34d399] mb-3.5">
                      <Icon size={19} />
                    </div>
                    <h3 className="font-bold font-card-title text-base text-[var(--text-primary)] mb-1.5">{title}</h3>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-normal">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section: About VoltOps ───────────────────────────────────────── */}
      <section id="about" className="py-20 max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              About VoltOps
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--text-primary)] leading-tight">
              Built for commercial{" "}
              <span className="font-serif-italic font-normal">
                facility coordination
              </span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We bridge commercial facility managers with verified multi-trade technicians, eliminating the frustration of unverified independent contractors and unpredictable arrival delays.
            </p>
          </div>
          <div className="lg:col-span-6 space-y-3.5">
            {[
              { title: "No uncertified technicians", desc: "Trade licenses and safety credentials are confirmed before assignment." },
              { title: "No double bookings", desc: "Active jobs and proximity matching prevent overlapping assignments." },
              { title: "Real accountability", desc: "Transparent physical arrival tracking and digital itemized repair logs." },
            ].map(({ title, desc }) => (
              <div key={title} className="p-5 rounded-2xl border border-[var(--border)] glass-panel space-y-1 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                  <CheckCircleIcon size={16} className="text-[#10b981] dark:text-[#34d399] shrink-0" />
                  <span>{title}</span>
                </div>
                <p className="text-xs pl-6 text-[var(--text-secondary)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: Contact & Inquiries (Accessible Form) ───────────────── */}
      <section id="contact" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          {/* Banner */}
          <div
            className="p-8 sm:p-10 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 glass-panel glow-card-emerald mb-14 border border-[#10b981]/40"
          >
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
                Ready to safeguard your facility operations?
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Select a coverage plan or discuss bespoke multi-site requirements.
              </p>
            </div>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#packages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] shrink-0 shadow-md hover:bg-[#34d399] transition-all"
            >
              <span>View Plans</span>
              <ArrowRightIcon size={14} />
            </motion.a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
            {/* Contact info */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
                  Direct Inquiries
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-heading mt-1.5 text-slate-900 dark:text-white">
                  Talk with our team
                </h2>
                <p className="text-sm mt-1.5 text-slate-600 dark:text-slate-400">
                  Enterprise inquiries or multi-facility complex coordination? Send our operations team a message.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: MailIcon, label: "Email", value: "support@voltops.example" },
                  { icon: PhoneIcon, label: "Phone", value: "+880 1XXX-XXXXXX" },
                  { icon: MapPinIcon, label: "Operations Desk", value: "Dhaka Central & Regional Hubs, Bangladesh" },
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
                <p className="text-xs mb-4 text-slate-600 dark:text-slate-400">
                  For sales and custom schedule inquiries. For active emergencies, subscribe and log in to dispatch.
                </p>
                {contactDone ? (
                  <div className="p-4 rounded-2xl text-sm border flex items-center gap-2 border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <CheckCircleIcon size={18} />
                    <span>Inquiry submitted. Our coordination desk will reply within one business day.</span>
                  </div>
                ) : (
                  <form onSubmit={handleContact} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="landing-contact-name" className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Your Name</label>
                        <input
                          id="landing-contact-name"
                          name="name"
                          type="text"
                          required
                          value={cName}
                          onChange={(e) => setCName(e.target.value)}
                          placeholder="Facility Manager"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                        />
                      </div>
                      <div>
                        <label htmlFor="landing-contact-email" className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Business Email</label>
                        <input
                          id="landing-contact-email"
                          name="email"
                          type="email"
                          required
                          value={cEmail}
                          onChange={(e) => setCEmail(e.target.value)}
                          placeholder="manager@company.com"
                          className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="landing-contact-company" className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Company / Facility Name</label>
                      <input
                        id="landing-contact-company"
                        name="company"
                        type="text"
                        value={cCompany}
                        onChange={(e) => setCCompany(e.target.value)}
                        placeholder="Apex Galleria Complex"
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                    </div>
                    <div>
                      <label htmlFor="landing-contact-message" className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Message</label>
                      <textarea
                        id="landing-contact-message"
                        name="message"
                        rows={3}
                        required
                        value={cMsg}
                        onChange={(e) => setCMsg(e.target.value)}
                        placeholder="Describe your facility locations, equipment types, and coverage requirements..."
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#10b981] resize-none"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-md"
                    >
                      <span>Send Inquiry</span>
                      <ArrowRightIcon size={14} />
                    </motion.button>
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
              © 2026 VoltOps · Commercial field-service coordination platform
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Team Pranta</div>
        </div>
      </footer>
    </div>
  );
}
