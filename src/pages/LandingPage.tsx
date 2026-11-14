import { useState, useEffect, useRef, FormEvent, FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useSpring, useReducedMotion, useInView } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { COVERAGE_PLANS } from "../config/coveragePricing";
import { OPERATIONAL_REACH_METRICS, OPERATIONAL_REACH_DISCLAIMER } from "../config/operationalReach";
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
  { step: 1, icon: FileTextIcon, title: "Select Coverage", desc: "Select your coverage window and arrival SLA." },
  { step: 2, icon: AlertTriangleIcon, title: "Submit Request", desc: "Report breakdowns instantly via mobile or web." },
  { step: 3, icon: CompassIcon, title: "Verified Matching", desc: "Automated verification of license, skills, and proximity." },
  { step: 4, icon: ZapIcon, title: "Technician Arrives", desc: "Certified tech arrives within your guaranteed window." },
  { step: 5, icon: CheckCircleIcon, title: "Digital Sign-Off", desc: "On-site inspection, approval, and digital billing." },
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
      animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }}
      whileHover={{ scale: 1.08, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
      }}
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

// ── Smooth Count-Up Metric Component for Reach Statistics ────────────────
function CountUpMetric({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const shouldReduce = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(shouldReduce ? value : 0);
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: "-20px" });

  useEffect(() => {
    if (shouldReduce || !inView) return;
    const durationMs = 1200;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = value * eased;
      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [inView, value, decimals, shouldReduce]);

  return (
    <span ref={nodeRef} className="tabular-nums">
      {decimals > 0 ? displayValue.toFixed(decimals) : displayValue}
      {suffix && <span className="font-sans font-bold ml-0.5 text-2xl sm:text-3xl text-emerald-500">{suffix}</span>}
    </span>
  );
}

// ── Wordmark Letters for Staggered Entrance ──────────────────────────────
const WORDMARK_LETTERS = ["V", "o", "l", "t", "O", "p", "s"];

const wordmarkContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.12,
    },
  },
};

const wordmarkLetterVariants = {
  hidden: { opacity: 0, y: 5, filter: "blur(2px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const statusDotVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { delay: 0.45, duration: 0.35, ease: "easeOut" as const },
  },
};

// ── Main Landing Page Component ──────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const { user } = useAuth();
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

  // Context-aware navbar: adapts appearance to whether the section directly behind the floating navbar is dark or light
  const [activeSectionTone, setActiveSectionTone] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (isDark) {
      setActiveSectionTone("dark");
      return;
    }

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section-tone]"));
    if (!sections.length) return;

    const determineTone = () => {
      if (isDark) {
        setActiveSectionTone("dark");
        return;
      }
      const sampleY = 40; // vertical center of floating navbar
      const sampleX = window.innerWidth / 2;
      const el = document.elementFromPoint(sampleX, sampleY);
      const matched = el?.closest<HTMLElement>("[data-section-tone]");
      if (matched) {
        const toneAttr = matched.getAttribute("data-section-tone");
        setActiveSectionTone(toneAttr === "dark" ? "dark" : "light");
        return;
      }
      for (const sec of sections) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= sampleY && rect.bottom >= sampleY) {
          const toneAttr = sec.getAttribute("data-section-tone");
          setActiveSectionTone(toneAttr === "dark" ? "dark" : "light");
          return;
        }
      }
    };

    const observer = new IntersectionObserver(
      () => {
        determineTone();
      },
      {
        rootMargin: "0px 0px -85% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );

    sections.forEach((s) => observer.observe(s));
    window.addEventListener("scroll", determineTone, { passive: true });
    window.addEventListener("resize", determineTone, { passive: true });
    window.addEventListener("hashchange", determineTone, { passive: true });

    determineTone();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", determineTone);
      window.removeEventListener("resize", determineTone);
      window.removeEventListener("hashchange", determineTone);
    };
  }, [isDark]);

  const isNavbarDark = isDark || activeSectionTone === "dark";

  // Breathing green status dot animation (vibrant, natural ~1.8s loop)
  const dotPulseAnimation = shouldReduceMotion
    ? undefined
    : {
        scale: [1, 1.25, 1],
        opacity: [0.9, 1, 0.9],
        boxShadow: [
          "0 0 4px rgba(16, 185, 129, 0.5)",
          "0 0 14px rgba(16, 185, 129, 1)",
          "0 0 4px rgba(16, 185, 129, 0.5)",
        ],
        transition: {
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  // Mobile menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // Close mobile menu if window is resized to desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      sessionStorage.setItem("voltops_pending_plan", plan);
      if (user && user.role === "CUSTOMER") {
        navigate(`/checkout?plan=${plan}`);
      } else {
        navigate(`/register?package=${plan}`);
      }
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
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
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

      {/* ── Floating Navigation (Accessible, Responsive, Persistent Across All Sections, Tone-Adaptive) ─────────── */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-3.5 sm:px-6 pt-3 sm:pt-4 transition-all duration-300"
      >
        <div className="max-w-xl md:max-w-3xl lg:max-w-6xl mx-auto">
          <nav
            className={`pointer-events-auto px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all duration-300 ease-in-out ${
              isNavbarDark
                ? scrolled
                  ? "backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] bg-slate-950/80 border border-white/20"
                  : "backdrop-blur-xl bg-slate-950/45 shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-white/15"
                : scrolled
                ? "backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.08)] bg-white/85 border border-slate-300/80"
                : "backdrop-blur-xl bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-200/80"
            }`}
            aria-label="Main Navigation"
          >
            <div className="flex items-center justify-between">
              {/* Logo Mark & Staggered Wordmark */}
              <a href="#" className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none">
                <LogoMark size={32} />
                <div className="flex items-center gap-1.5">
                  {shouldReduceMotion ? (
                    <span
                      className={`font-heading font-extrabold text-[17px] tracking-tight transition-colors ${
                        isNavbarDark
                          ? "text-white group-hover:text-emerald-400"
                          : "text-slate-900 group-hover:text-emerald-600"
                      }`}
                    >
                      VoltOps
                    </span>
                  ) : (
                    <motion.div
                      variants={wordmarkContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className={`flex font-heading font-extrabold text-[17px] tracking-tight transition-colors ${
                        isNavbarDark
                          ? "text-white group-hover:text-emerald-400"
                          : "text-slate-900 group-hover:text-emerald-600"
                      }`}
                    >
                      {WORDMARK_LETTERS.map((char, index) => (
                        <motion.span
                          key={index}
                          variants={wordmarkLetterVariants}
                          className="inline-block"
                        >
                          {char}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                  {/* Vibrant breathing status dot with outer pulsing ring */}
                  <span className="relative flex h-3 w-3 items-center justify-center">
                    <motion.span
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: [1, 2.4, 1],
                              opacity: [0.75, 0.05, 0.75],
                              transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const },
                            }
                      }
                      className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
                    />
                    <motion.span
                      variants={shouldReduceMotion ? {} : statusDotVariants}
                      initial={shouldReduceMotion ? "visible" : "hidden"}
                      animate="visible"
                      className="relative flex items-center justify-center"
                    >
                      <motion.span
                        animate={shouldReduceMotion ? undefined : dotPulseAnimation}
                        className="inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                      />
                    </motion.span>
                  </span>
                </div>
              </a>

              {/* Desktop Center Nav Pills (Context-Aware Translucent Glass Treatment) */}
              <div
                className={`hidden lg:flex items-center gap-0.5 xl:gap-1 text-xs font-semibold px-2 xl:px-2.5 py-1 rounded-full border backdrop-blur-sm transition-all duration-300 ${
                  isNavbarDark
                    ? "border-white/10 bg-white/5"
                    : "border-slate-900/10 bg-slate-900/[0.04]"
                }`}
              >
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
                    className={`px-2.5 xl:px-3 py-1 rounded-full transition-all font-semibold ${
                      isNavbarDark
                        ? "text-slate-200 hover:text-white hover:bg-white/10"
                        : "text-slate-700 hover:text-slate-950 hover:bg-slate-900/5"
                    }`}
                  >
                    {label}
                  </a>
                ))}
              </div>

              {/* Desktop Right Actions */}
              <div className="hidden lg:flex items-center gap-2 xl:gap-2.5">
                <ThemeToggle
                  className={
                    isNavbarDark
                      ? "!border-white/15 !bg-white/5 !text-slate-200 hover:!text-white hover:!bg-white/10"
                      : "!border-slate-300/80 !bg-slate-900/[0.04] !text-slate-700 hover:!text-slate-950 hover:!bg-slate-900/10"
                  }
                />
                <Link
                  to="/login"
                  className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isNavbarDark
                      ? "text-slate-200 hover:text-white hover:bg-white/10"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-900/5"
                  }`}
                >
                  Sign in
                </Link>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href="#packages"
                  className="inline-flex items-center gap-1.5 px-3.5 xl:px-4 py-1.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-[#34d399] transition-all group"
                >
                  <span>Choose Plan</span>
                  <ArrowRightIcon size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </motion.a>
              </div>

              {/* Mobile / Tablet Actions */}
              <div className="lg:hidden flex items-center gap-2">
                <a
                  href="#packages"
                  className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
                >
                  Plans
                </a>
                <ThemeToggle
                  className={
                    isNavbarDark
                      ? "!border-white/15 !bg-white/5 !text-slate-200 hover:!text-white hover:!bg-white/10"
                      : "!border-slate-300/80 !bg-slate-900/[0.04] !text-slate-700 hover:!text-slate-950 hover:!bg-slate-900/10"
                  }
                />
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isNavbarDark
                      ? "border-white/15 bg-white/5 text-slate-200 hover:text-white hover:bg-white/10"
                      : "border-slate-300/80 bg-slate-900/[0.04] text-slate-700 hover:text-slate-950 hover:bg-slate-900/10"
                  }`}
                  aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav-panel"
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
          </nav>

          {/* Clean Rectangular / Softly Rounded Mobile Dropdown Panel */}
          {menuOpen && (
            <div
              id="mobile-nav-panel"
              className={`pointer-events-auto lg:hidden mt-2 p-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl space-y-1.5 transition-all animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-5rem)] overflow-y-auto ${
                isNavbarDark
                  ? "border-white/15 bg-slate-950/95 text-slate-200"
                  : "border-slate-200 bg-white/95 text-slate-800"
              }`}
              role="dialog"
              aria-label="Mobile Navigation Menu"
            >
              <div className="space-y-1">
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
                    className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isNavbarDark
                        ? "text-slate-300 hover:text-white hover:bg-white/10"
                        : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </a>
                ))}
              </div>
              <div className="pt-2.5 border-t border-[var(--border)] flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`w-1/2 text-center py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    isNavbarDark
                      ? "border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 shadow-sm"
                      : "border border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200 hover:border-slate-400 shadow-sm"
                  }`}
                >
                  Sign in
                </Link>
                <a
                  href="#packages"
                  onClick={() => setMenuOpen(false)}
                  className="w-1/2 text-center py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
                >
                  Choose a Plan
                </a>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── HERO SECTION: INDUSTRIAL MAINTENANCE PHOTOGRAPHY & ENTRANCE ─── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header data-section-tone="dark" className="relative overflow-hidden pt-20 sm:pt-22 lg:pt-24 pb-20 lg:pb-24 text-center">
        {/* Hero Background Layer: Looping Cinematic Slow-Motion Video with Dark CSS Overlay */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
          }}
        >
          {/* Highly compressed looping 16:9 video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/images/hero-video-poster.jpg"
            className="absolute inset-0 w-full h-full object-cover filter brightness-[1.12] contrast-[1.04]"
            style={{ objectPosition: "54% 22%" }}
          >
            <source src="/videos/hero-background.mp4" type="video/mp4" />
            <img
              src="/images/hero-video-poster.jpg"
              alt="Commercial Field Service Operations"
              className="w-full h-full object-cover filter brightness-[1.12] contrast-[1.04]"
              style={{ objectPosition: "54% 22%" }}
            />
          </video>

          {/* Balanced cinematic dark overlay: keeps engineers and facility background visible while ensuring high contrast for white text */}
          <div
            className="absolute inset-0 transition-colors duration-300"
            style={{
              background: isDark
                ? "radial-gradient(ellipse at 50% 32%, rgba(6, 12, 20, 0.44) 0%, rgba(6, 12, 20, 0.62) 100%)"
                : "radial-gradient(ellipse at 50% 32%, rgba(6, 12, 20, 0.40) 0%, rgba(6, 12, 20, 0.54) 100%)",
            }}
          />

          {/* Smooth multi-stop bottom fade into base theme background (prevents sudden dark block) */}
          <div
            className="absolute inset-x-0 bottom-0 h-56 sm:h-72 pointer-events-none transition-colors duration-300"
            style={{
              background: isDark
                ? "linear-gradient(to bottom, transparent 0%, rgba(11, 17, 23, 0.3) 30%, rgba(11, 17, 23, 0.75) 70%, var(--bg-base) 100%)"
                : "linear-gradient(to bottom, transparent 0%, rgba(248, 250, 252, 0.25) 30%, rgba(248, 250, 252, 0.8) 70%, var(--bg-base) 100%)",
            }}
          />
        </div>

        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-6xl mx-auto px-5"
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
      <section id="services" data-section-tone="auto" className="py-20 max-w-6xl mx-auto px-5">
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
          <h2 className="text-3xl sm:text-4xl font-space font-bold tracking-tight text-[var(--text-primary)]">
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
      <section id="dispatch" data-section-tone="auto" className="py-20 max-w-6xl mx-auto px-5">
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
          <h2 className="text-3xl sm:text-4xl font-space font-bold tracking-tight text-[var(--text-primary)]">
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
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel glow-card-emerald space-y-5 transition-shadow duration-300 hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.22)]"
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
              Human-verified dispatch. Transparent AI scoring.
            </p>
          </motion.div>

          {/* Right Bento: Candidate Audit Evaluation */}
          <motion.div
            variants={cardItemVariants}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-6 p-7 rounded-[32px] border border-[var(--border)] glass-panel space-y-4 transition-shadow duration-300 hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.22)]"
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
              <p className="text-xs text-slate-700 dark:text-slate-300">CCTV Specialist | Tejgaon Hub | Available</p>
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
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Security Tech | Banani | 1 Active Job</p>
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
      <section id="how" data-section-tone="auto" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
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
            <h2 className="text-3xl sm:text-4xl font-space font-bold tracking-tight text-[var(--text-primary)]">
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
                  whileHover={{ y: -5, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredStep(step)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onFocus={() => setHoveredStep(step)}
                  onBlur={() => setHoveredStep(null)}
                  className={`p-5 rounded-[26px] border border-[var(--border)] glass-panel transition-all duration-200 cursor-default hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.22)] ${
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
      <section id="packages" data-section-tone="auto" className="py-20 max-w-6xl mx-auto px-5">
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
          <h2 className="text-3xl sm:text-4xl font-space font-bold tracking-tight text-[var(--text-primary)]">
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
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col transition-shadow duration-300 hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.25)] rounded-[30px]"
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
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{COVERAGE_PLANS["8hr"].formattedPrice}</span>
                    <span className="text-xs text-slate-500">{COVERAGE_PLANS["8hr"].billingUnit}</span>
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Prototype Pricing • 08:00 – 17:00</div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Arrival SLA commitment:</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No physical arrival SLA</span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  {["15 included visits / cycle", "Business Hours (08:00 - 16:00)", "Scheduled daytime repairs", "All 7 trades covered"].map((b) => (
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
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col transition-shadow duration-300 hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.25)] rounded-[30px]"
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
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{COVERAGE_PLANS["247-standard"].formattedPrice}</span>
                    <span className="text-xs text-slate-500">{COVERAGE_PLANS["247-standard"].billingUnit}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Prototype Pricing • 24 Hours / 7 Days</div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Arrival SLA commitment:</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Within 40 minutes on site</span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  {["25 included visits / cycle", "Round-the-clock coverage", "40-min physical arrival SLA", "Digital repair logs"].map((b) => (
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
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col transition-shadow duration-300 hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.3)] rounded-[30px]"
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
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{COVERAGE_PLANS["247-priority"].formattedPrice}</span>
                    <span className="text-xs text-slate-500">{COVERAGE_PLANS["247-priority"].billingUnit}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Prototype Pricing • 24/7 · 2× faster arrival SLA</div>
                </div>

                <div className="p-3 rounded-2xl border border-[#10b981]/40 bg-[#10b981]/10">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-[#34d399] block">Arrival SLA commitment:</span>
                  <span className="text-base font-extrabold font-heading text-slate-900 dark:text-white">Within 20 minutes on site</span>
                </div>

                <ul className="space-y-1.5 text-xs">
                  {["30 included visits / cycle", "Critical commercial coverage", "20-min rapid arrival (2x faster)", "Top emergency priority"].map((b, i) => (
                    <li key={b} className={`flex items-center gap-2 ${i === 0 || i === 1 ? "font-bold text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"}`}>
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
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col transition-shadow duration-300 hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.25)] rounded-[30px]"
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
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{COVERAGE_PLANS["custom"].formattedPrice}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Enterprise Negotiated • Custom quote</div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Example shifts:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">6, 8, 12, or 16 hours/day</span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  {["Negotiated visit allowance", "Tailored enterprise shifts", "Negotiated SLAs", "Multi-facility scaling"].map((b) => (
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
      <section id="hubs" data-section-tone="auto" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
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
            <h2 className="text-3xl font-space font-bold tracking-tight text-[var(--text-primary)]">
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

      {/* ── Section: Our Operational Reach (Commercial Scale & Industrial Reach) ── */}
      <section id="statistics" data-section-tone="auto" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="text-center max-w-xl mx-auto mb-14 space-y-2.5"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] dark:text-[#34d399]">
              Our Operational Reach
            </span>
            <h2 className="text-3xl sm:text-4xl font-space font-bold tracking-tight text-[var(--text-primary)]">
              Built for commercial{" "}
              <span className="font-serif-italic font-normal">
                operations
              </span>
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Illustrative platform scale demonstrating multi-zone technician dispatching and enterprise reliability.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={sectionContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {OPERATIONAL_REACH_METRICS.map((metric) => (
              <motion.div
                key={metric.id}
                variants={cardItemVariants}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-[28px] border glass-panel flex flex-col justify-between shadow-[var(--shadow-sm)] transition-all text-center ${
                  metric.highlight
                    ? "border-2 border-[#10b981] bg-emerald-500/5 shadow-[0_0_24px_rgba(16,185,129,0.15)]"
                    : "border-[var(--border)] hover:border-[#10b981]/50"
                }`}
              >
                <div>
                  <div
                    className={`text-4xl sm:text-5xl font-extrabold font-heading tracking-tight ${
                      metric.highlight
                        ? "text-[#10b981] dark:text-[#34d399]"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    <CountUpMetric
                      value={metric.targetValue}
                      decimals={metric.decimals || 0}
                      suffix={metric.suffix}
                    />
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-2">
                    {metric.label}
                  </h3>
                </div>
                <p
                  className={`text-xs text-[var(--text-secondary)] mt-3 leading-relaxed pt-3 border-t ${
                    metric.highlight ? "border-[#10b981]/30" : "border-[var(--border)]"
                  }`}
                >
                  {metric.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Understated illustrative prototype disclaimer */}
          <p className="text-center text-[11px] text-[var(--text-muted)] mt-8 italic">
            {OPERATIONAL_REACH_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* ── Section: About VoltOps ───────────────────────────────────────── */}
      <section id="about" data-section-tone="auto" className="py-20 max-w-6xl mx-auto px-5">
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
      <section id="contact" data-section-tone="auto" className="py-20 border-t border-[var(--border)] bg-[var(--bg-surface-2)]">
        <div className="max-w-6xl mx-auto px-5">
          {/* Banner */}
          <div
            className="p-8 sm:p-10 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 glass-panel glow-card-emerald mb-14 border border-[#10b981]/40"
          >
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-space font-bold tracking-tight text-slate-900 dark:text-white">
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
                <h2 className="text-2xl sm:text-3xl font-space font-bold tracking-tight mt-1.5 text-slate-900 dark:text-white">
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

      {/* ── Production-Quality SaaS Footer (Dark, Sophisticated, Focused) ── */}
      <footer data-section-tone="dark" className="relative border-t border-[var(--border)] bg-[#070b10] text-slate-400 overflow-hidden">
        {/* Subtle top emerald gradient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto px-5 pt-14 pb-8 sm:pt-16 sm:pb-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-white/10 items-start">
            {/* Brand Area (md:col-span-5 lg:col-span-4) */}
            <div className="md:col-span-5 lg:col-span-4 space-y-3.5 text-left">
              <a href="#" className="flex items-center gap-2.5 group w-fit focus-visible:outline-none">
                <LogoMark size={28} />
                <span className="font-heading font-extrabold text-[18px] tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  VoltOps
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </a>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Commercial field-service coordination platform. Deterministic 20–40 minute physical arrival SLAs and verified multi-trade dispatching for mission-critical facilities.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Enterprise Dispatch Engine & Skill Passport Verification</span>
              </div>
            </div>

            {/* Quick Navigation: 3 Distinct Columns (md:col-span-7 lg:col-span-8) */}
            <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 text-left">
              {/* Column 1: Platform */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  Platform
                </div>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a href="#services" className="hover:text-emerald-400 transition-colors">
                      Services & Trades
                    </a>
                  </li>
                  <li>
                    <a href="#dispatch" className="hover:text-emerald-400 transition-colors">
                      Operations & Dispatch
                    </a>
                  </li>
                  <li>
                    <a href="#how" className="hover:text-emerald-400 transition-colors">
                      How It Works
                    </a>
                  </li>
                  <li>
                    <a href="#packages" className="hover:text-emerald-400 transition-colors">
                      Coverage Plans
                    </a>
                  </li>
                </ul>
              </div>

              {/* Column 2: Support */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  Support
                </div>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a href="#contact" className="hover:text-emerald-400 transition-colors">
                      Dispatch Inquiries
                    </a>
                  </li>
                  <li>
                    <a href="#hubs" className="hover:text-emerald-400 transition-colors">
                      Regional Hubs
                    </a>
                  </li>
                  <li>
                    <a href="#statistics" className="hover:text-emerald-400 transition-colors">
                      SLA Commitments
                    </a>
                  </li>
                  <li>
                    <span className="text-emerald-400/80 cursor-default">
                      24/7 Hotline Support
                    </span>
                  </li>
                </ul>
              </div>

              {/* Column 3: Legal & Standards */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  Governance
                </div>
                <ul className="space-y-2 text-xs">
                  <li>
                    <span className="text-slate-400 hover:text-slate-200 transition-colors cursor-default">
                      Service Level Terms
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400 hover:text-slate-200 transition-colors cursor-default">
                      Commercial Privacy
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400 hover:text-slate-200 transition-colors cursor-default">
                      Safety & Compliance
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400 hover:text-slate-200 transition-colors cursor-default">
                      Audit Trail Standards
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Planned Payment Brands & Ecosystem Strip */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-5">
            <div className="space-y-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Payment Ecosystem
                </span>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Planned Gateway Methods
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-md">
                Multi-gateway architecture designed for corporate cards, local MFS settlements, and automated recurring subscriptions.
              </p>
            </div>

            {/* Horizontal Brand Strip: 6 Recognizable Brands with Consistent Proportions */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center py-1">
              {[
                { name: "Stripe", src: "/images/payment-methods/stripe.svg", alt: "Stripe Secure Payments" },
                { name: "SSLCommerz", src: "/images/payment-methods/sslcommerz.svg", alt: "SSLCommerz Gateway" },
                { name: "Visa", src: "/images/payment-methods/visa.svg", alt: "Visa Card" },
                { name: "Mastercard", src: "/images/payment-methods/mastercard.svg", alt: "Mastercard" },
                { name: "American Express", src: "/images/payment-methods/amex.svg", alt: "American Express" },
                { name: "bKash", src: "/images/payment-methods/bkash.svg", alt: "bKash Merchant Payment" },
              ].map((brand) => (
                <div
                  key={brand.name}
                  className="h-8 sm:h-9 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-white/[0.08] border border-white/20 shadow-sm flex items-center justify-center transition-transform hover:scale-105"
                  title={brand.alt}
                >
                  <img
                    src={brand.src}
                    alt={brand.alt}
                    className="h-5 sm:h-5.5 w-auto max-w-[85px] object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} VoltOps. All rights reserved. Commercial facility coordination.
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span>Developed by</span>
              <a
                href="https://github.com/pranta2003/VoltOps-Frontend"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 font-semibold hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/40 hover:decoration-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
              >
                Team Pranta
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
