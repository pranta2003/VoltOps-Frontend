import { useState, useEffect, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────
interface ServiceScenario {
  id: string;
  category: string;
  categoryLabel: string;
  icon: string;
  title: string;
  client: string;
  urgency: "Urgent" | "High Priority" | "Active";
  slaInitialSeconds: number;
  slaTargetText: string;
  technician: {
    name: string;
    role: string;
    location: string;
    distanceText: string;
    matchScore: number;
    explanation: string;
    checks: string[];
  };
  timelineStep: number;
}

// ── Multi-Category Mock Scenarios for Hero Console ───────────────────
const SERVICE_SCENARIOS: ServiceScenario[] = [
  {
    id: "hvac",
    category: "Cooling & Mechanical",
    categoryLabel: "Commercial HVAC / AC",
    icon: "❄️",
    title: "WO-2041 · Central Chiller Shutdown & Compressor Tripping",
    client: "Apex Retail Galleria · Ground Floor Outlets",
    urgency: "Urgent",
    slaInitialSeconds: 1145, // ~19 mins left
    slaTargetText: "20-Min Priority SLA",
    technician: {
      name: "Tariqul Alam",
      role: "HVAC & Industrial Chiller Specialist",
      location: "Gulshan 1 · 0 active jobs",
      distanceText: "1.4 km away · ETA 7 mins",
      matchScore: 96,
      explanation: "Certified refrigerant handling, diagnostic kit ready, on-duty within 2 km.",
      checks: ["✓ HVAC Certified", "✓ Free Now", "✓ 7 mins away", "✓ Diagnostic tools equipped"],
    },
    timelineStep: 3, // En route
  },
  {
    id: "electrical",
    category: "Electrical & Equipment",
    categoryLabel: "Power & Equipment",
    icon: "⚡",
    title: "WO-1054 · 500 KVA Industrial Generator Voltage Drop",
    client: "ABC Manufacturing Ltd · Production Line 2",
    urgency: "Urgent",
    slaInitialSeconds: 2310, // ~38 mins left
    slaTargetText: "40-Min Standard SLA",
    technician: {
      name: "Rahim Ahmed",
      role: "High-Voltage Power & Generator Engineer",
      location: "Mirpur 10 · 0 active jobs",
      distanceText: "3.2 km away · ETA 14 mins",
      matchScore: 94,
      explanation: "Safety electrical license verified, zero schedule conflicts, 14 minutes from factory.",
      checks: ["✓ High-Voltage Licensed", "✓ Free Now", "✓ Nearby", "✓ Low daily workload"],
    },
    timelineStep: 3,
  },
  {
    id: "security",
    category: "Security & Infrastructure",
    categoryLabel: "CCTV & Security",
    icon: "📹",
    title: "WO-3088 · Perimeter CCTV Offline & DVR Network Failure",
    client: "Northstar Logistics Hub · Warehouse Zone B",
    urgency: "High Priority",
    slaInitialSeconds: 1680, // ~28 mins left
    slaTargetText: "40-Min Standard SLA",
    technician: {
      name: "Tanvir Hasan",
      role: "Surveillance & Access Control Technician",
      location: "Tejgaon Commercial · 0 active jobs",
      distanceText: "2.1 km away · ETA 11 mins",
      matchScore: 91,
      explanation: "IP camera & NVR certified, tools in vehicle, closest verified technician.",
      checks: ["✓ NVR/IP Certified", "✓ Available", "✓ 11 mins away", "✓ Testing rig ready"],
    },
    timelineStep: 2, // Assigned
  },
  {
    id: "it",
    category: "IT & Systems",
    categoryLabel: "IT & Hardware",
    icon: "💻",
    title: "WO-4012 · Core Switch Reboot Loop & POS Connectivity Down",
    client: "Metro Mart Superstore · 8 Cash Counters",
    urgency: "Urgent",
    slaInitialSeconds: 980, // ~16 mins left
    slaTargetText: "20-Min Priority SLA",
    technician: {
      name: "Saif Chowdhury",
      role: "Network Infrastructure & Systems Engineer",
      location: "Dhanmondi 27 · 0 active jobs",
      distanceText: "1.8 km away · ETA 9 mins",
      matchScore: 95,
      explanation: "Network hardware certified, replacement switch in dispatch buffer, immediate dispatch.",
      checks: ["✓ Network Certified", "✓ On Standby", "✓ 9 mins away", "✓ Spare hardware routed"],
    },
    timelineStep: 3,
  },
  {
    id: "facility",
    category: "Building Maintenance",
    categoryLabel: "Facility Maintenance",
    icon: "🛠️",
    title: "WO-5023 · Automatic Glass Entry Door Jam & Rail Misalignment",
    client: "Crown Corporate Plaza · Main Lobby",
    urgency: "Active",
    slaInitialSeconds: 2240, // ~37 mins left
    slaTargetText: "40-Min Standard SLA",
    technician: {
      name: "Kamrul Islam",
      role: "Commercial Facility & Mechanical Fitter",
      location: "Mohakhali DOHS · 0 active jobs",
      distanceText: "2.8 km away · ETA 13 mins",
      matchScore: 89,
      explanation: "Commercial door system specialist, standard parts in mobile unit, verified available.",
      checks: ["✓ Facility Licensed", "✓ Available Now", "✓ 13 mins away", "✓ Hardware stocked"],
    },
    timelineStep: 2,
  },
];

// ── Helper Components ──────────────────────────────────────────────────
function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-dark border border-brand-light/40 flex items-center justify-center shrink-0 shadow-sm ${className}`}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    </div>
  );
}

function CheckIcon({ className = "w-4 h-4 text-status-available shrink-0 mt-0.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  // Page title
  useEffect(() => {
    document.title = "VoltOps | Field service workforce and service management";
  }, []);

  // Sticky nav scroll tracking
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mobile menu open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Category Scenario in Hero Console
  const [activeScenarioId, setActiveScenarioId] = useState<string>("hvac");
  const activeScenario =
    SERVICE_SCENARIOS.find((s) => s.id === activeScenarioId) || SERVICE_SCENARIOS[0];

  // Live countdown timer for the active scenario
  const [scenarioTimes, setScenarioTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    SERVICE_SCENARIOS.forEach((s) => {
      initial[s.id] = s.slaInitialSeconds;
    });
    return initial;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setScenarioTimes((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key] > 0) {
            next[key] -= 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Contact form submission state
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setContactName("");
    setContactEmail("");
    setContactCompany("");
    setContactMessage("");
  };

  const handleSelectPackage = (pkg: "weekly" | "monthly-standard" | "monthly-priority") => {
    navigate(`/register?package=${pkg}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-brand-light selection:text-white">
      {/* ── Navigation Bar ────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-xl shadow-black/20"
            : "bg-transparent border-b border-white/5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 font-bold text-xl tracking-tight text-white group">
            <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="leading-tight">VoltOps</span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-cyan-400">Field Service Platform</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#services" className="hover:text-cyan-400 transition-colors">
              Services
            </a>
            <a href="#how" className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="#dispatch" className="hover:text-cyan-400 transition-colors">
              Matching Engine
            </a>
            <a href="#packages" className="hover:text-cyan-400 transition-colors">
              Subscription Plans
            </a>
            <a href="#about" className="hover:text-cyan-400 transition-colors">
              About
            </a>
            <a href="#contact" className="hover:text-cyan-400 transition-colors">
              Contact
            </a>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 border border-slate-700/60 transition-all"
            >
              Sign in
            </Link>
            <a
              href="#packages"
              className="px-4.5 py-2 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:opacity-95 shadow-lg shadow-cyan-500/20 transition-all"
            >
              Choose a Plan
            </a>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-slate-800"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-6 py-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col space-y-3 text-base font-medium text-slate-300">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-cyan-400 border-b border-slate-800/60"
              >
                Services
              </a>
              <a
                href="#how"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-cyan-400 border-b border-slate-800/60"
              >
                How It Works
              </a>
              <a
                href="#dispatch"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-cyan-400 border-b border-slate-800/60"
              >
                Matching Engine
              </a>
              <a
                href="#packages"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-cyan-400 border-b border-slate-800/60"
              >
                Subscription Plans
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-cyan-400 border-b border-slate-800/60"
              >
                About
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-cyan-400"
              >
                Contact
              </a>
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-lg text-sm font-semibold text-slate-200 bg-slate-900 border border-slate-700"
              >
                Sign in
              </Link>
              <a
                href="#packages"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300"
              >
                Choose a Plan
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section (Cinematic, Modern, Visual Depth) ────────────── */}
      <header className="relative overflow-hidden pt-8 pb-20 lg:pt-14 lg:pb-32">
        {/* Ambient Glows & Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: "radial-gradient(rgba(56, 189, 248, 0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[30rem] h-[30rem] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-cyan-300 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Subscription-Based Field Service Coordination</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-white leading-[1.12]">
                One service plan.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300">
                  The right professional
                </span>{" "}
                when your business needs one.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                From AC breakdowns and CCTV faults to electrical repairs, IT support and facility
                maintenance — VoltOps connects your business with qualified technicians, backed by a
                fast arrival commitment defined by your service plan.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a
                  href="#packages"
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
                >
                  <span>Explore Service Plans</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950/20 font-bold">20m / 40m SLA</span>
                </a>
                <a
                  href="#how"
                  className="px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
                >
                  See How It Works
                </a>
              </div>

              {/* Multi-Industry Service Scope Pills */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Supported Business Service Categories:
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
                    <span>⚡</span> <span>Electrical & Power</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
                    <span>❄️</span> <span>Commercial HVAC & AC</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
                    <span>📹</span> <span>CCTV & Security</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
                    <span>💻</span> <span>IT & Networking</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
                    <span>🛠️</span> <span>Facility Upkeep</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Right: Interactive Multi-Category Service Console */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl shadow-cyan-950/40 p-5 sm:p-7 backdrop-blur-xl">
                {/* Console Header & Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Live Coordination Dispatch
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white">Interactive Job Simulation</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    Switch Trade ↓
                  </span>
                </div>

                {/* Scenario Category Selector Tabs */}
                <div className="flex gap-1.5 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-slate-800/60">
                  {SERVICE_SCENARIOS.map((scenario) => {
                    const isActive = scenario.id === activeScenario.id;
                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => setActiveScenarioId(scenario.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                          isActive
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                            : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <span>{scenario.icon}</span>
                        <span>{scenario.categoryLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Work Order Card */}
                <div className="mt-4 pt-1 space-y-4">
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-cyan-400 block">{activeScenario.category}</span>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">{activeScenario.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{activeScenario.client}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        {activeScenario.urgency}
                      </span>
                      <div className="text-xs font-mono font-bold text-cyan-300 mt-1.5">
                        ETA {formatSeconds(scenarioTimes[activeScenario.id] || 600)}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{activeScenario.slaTargetText}</span>
                    </div>
                  </div>

                  {/* Assigned / Matched Technician Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-xl border-2 border-cyan-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm sm:text-base">
                            {activeScenario.technician.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {activeScenario.technician.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {activeScenario.technician.role} · {activeScenario.technician.distanceText}
                        </p>
                      </div>
                      <Link
                        to="/login"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors shrink-0"
                      >
                        Assign Job
                      </Link>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
                      <span className="text-slate-300 font-semibold">Dispatcher Note:</span>{" "}
                      {activeScenario.technician.explanation}
                    </p>

                    {/* Criteria Checkmarks */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-emerald-400 font-medium">
                      {activeScenario.technician.checks.map((chk, i) => (
                        <span key={i} className="truncate">
                          {chk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Customer Status Pipeline */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span className="font-semibold text-slate-300">Live Customer Tracker:</span>
                      <span className="text-cyan-300 font-medium">En Route to Site</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                      <div className="py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        1. Reported
                      </div>
                      <div className="py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        2. Reviewed
                      </div>
                      <div className="py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        3. Assigned
                      </div>
                      <div className="py-1 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold">
                        4. En Route
                      </div>
                      <div className="py-1 rounded bg-slate-800 text-slate-500">5. On Site</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Key SLA & Operational Credibility Strip ───────────────────── */}
      <section className="border-y border-slate-800 bg-slate-950/60 py-10 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-left">
          <div className="border-l-2 border-cyan-400 pl-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">20 & 40 min</div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Guaranteed technician on-site arrival targets
            </p>
          </div>
          <div className="border-l-2 border-teal-400 pl-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">5 Core Domains</div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              HVAC, Electrical, Security, IT & Facilities
            </p>
          </div>
          <div className="border-l-2 border-emerald-400 pl-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">100% Human</div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Dispatcher-verified assignments for safety
            </p>
          </div>
          <div className="border-l-2 border-amber-400 pl-4">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">0 Expired</div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Certificates or unvetted staff dispatched
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 1: The 5 Service Categories ──────────────────────── */}
      <section id="services" className="py-20 lg:py-28 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Comprehensive Field Operations
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            One subscription for every facility challenge
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Stop juggling dozens of independent contractors. VoltOps coordinates vetted, qualified
            field professionals across five essential business trades under a single unified SLA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {/* Card 1: Electrical */}
          <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:-translate-y-1.5 transition-all duration-200 shadow-lg group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">High & Low Voltage</span>
            <h3 className="text-xl font-bold text-white mt-1">Electrical & Power Systems</h3>
            <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
              Industrial generators, step-down transformers, commercial switchboards, capacitor banks,
              UPS backups, and severe line faults.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Generator synchronization & AVR testing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Transformer oil & insulation inspection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Phase imbalance & emergency restoration</span>
              </li>
            </ul>
          </div>

          {/* Card 2: HVAC */}
          <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:-translate-y-1.5 transition-all duration-200 shadow-lg group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              ❄️
            </div>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Climate & Ventilation</span>
            <h3 className="text-xl font-bold text-white mt-1">Cooling & Mechanical HVAC</h3>
            <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
              Commercial VRF/VRV units, rooftop chillers, ducted split systems, compressor failures,
              refrigerant leak diagnostics, and preventive duct servicing.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chiller & compressor breakdown diagnostics</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>VRF system refrigerant recharge & vacuuming</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scheduled indoor air quality & filter cycles</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Security & Surveillance */}
          <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:-translate-y-1.5 transition-all duration-200 shadow-lg group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              📹
            </div>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Perimeter & Safety</span>
            <h3 className="text-xl font-bold text-white mt-1">Security & Surveillance</h3>
            <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
              IP CCTV cameras, optical fiber video feeds, DVR/NVR storage corruption, biometric
              turnstiles, and electronic door strike malfunctions.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Camera feed restoration & lens alignment</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>DVR/NVR hard drive raid reconfiguration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Access control reader & strike bar repairs</span>
              </li>
            </ul>
          </div>

          {/* Card 4: IT & Network */}
          <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:-translate-y-1.5 transition-all duration-200 shadow-lg group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              💻
            </div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Hardware & Connectivity</span>
            <h3 className="text-xl font-bold text-white mt-1">IT, Hardware & Networks</h3>
            <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
              Office networking drops, rack cabling, core router crashes, POS cash register
              downtime, workstation hardware triage, and network printer issues.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Managed switch & firewall drop diagnosis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Retail POS terminal & barcode scanner fixes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Server rack patch cord & port remapping</span>
              </li>
            </ul>
          </div>

          {/* Card 5: Facility Maintenance */}
          <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:-translate-y-1.5 transition-all duration-200 shadow-lg group">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              🛠️
            </div>
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Building Infrastructure</span>
            <h3 className="text-xl font-bold text-white mt-1">Facility & Building Upkeep</h3>
            <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
              Commercial wall and ceiling repairs, industrial epoxy painting touch-ups, automatic door
              sensors, lighting fixture overhaul, and structural facility upkeep.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>Partition wall & moisture barrier patch repair</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>Commercial storefront door alignment</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>Commercial facility lighting & fixture resets</span>
              </li>
            </ul>
          </div>

          {/* Card 6: Dispatch & Operations Platform */}
          <div className="p-7 rounded-2xl bg-gradient-to-br from-brand-dark to-slate-950 border border-cyan-500/40 hover:border-cyan-400 hover:-translate-y-1.5 transition-all duration-200 shadow-lg group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              🎯
            </div>
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Human-in-the-Loop</span>
            <h3 className="text-xl font-bold text-white mt-1">Dedicated Dispatch Control</h3>
            <p className="text-slate-300 text-sm mt-2.5 leading-relaxed">
              Every job is reviewed by a human dispatcher who evaluates certifications, verified tools,
              GPS proximity, and workload before issuing the on-site dispatch.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-cyan-200">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-cyan-300" />
                <span>Real-time GPS proximity technician routing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-cyan-300" />
                <span>Live SLA countdown timers with warning alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-cyan-300" />
                <span>Itemized digital invoices & equipment logs</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section 2: How It Works (The Customer Journey) ───────────── */}
      <section id="how" className="py-20 lg:py-28 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Streamlined Service Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              How VoltOps resolves facility issues
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              A clear, accountable coordination path from your initial subscription to on-site work
              completion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-16 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold flex items-center justify-center text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-white text-base">Subscribe to Plan</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Choose a Weekly or Monthly plan with a guaranteed 20 or 40-minute technician arrival
                SLA for your facilities.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold flex items-center justify-center text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-white text-base">Report the Issue</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                When a breakdown occurs, pick the category (HVAC, CCTV, Electrical, IT, etc.) and
                submit your service request.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold flex items-center justify-center text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-white text-base">Dispatcher Matches</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Our dispatcher reviews ranked technicians based on verified certifications, distance, and
                current workload.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold flex items-center justify-center text-lg mb-4">
                4
              </div>
              <h3 className="font-bold text-white text-base">Technician Arrives</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                The technician reaches your site within the committed SLA window, fully equipped to
                triage and execute the repair.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold flex items-center justify-center text-lg mb-4">
                5
              </div>
              <h3 className="font-bold text-white text-base">Approval & Invoice</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Review completed work on your dashboard, approve resolution, and view exact parts and
                service cost invoices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Explainable Matching & Dispatcher Authority ───── */}
      <section id="dispatch" className="py-20 lg:py-28 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Transparent Business Logic
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Assignments you can audit and trust
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Eligibility and ranking come from transparent operational rules — never an opaque algorithm.
              A human dispatcher always inspects the job and makes the official assignment.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Hard filtering first</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Expired certifications, active leave, and schedule double-bookings are
                    automatically excluded before candidate ranking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Transparent multi-factor scoring</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Trade qualifications, travel proximity, and workload are computed with plain
                    weighted arithmetic so match reasons are clear.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Human dispatcher decision</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    No automated rogue assignments. An experienced dispatcher reviews the candidate
                    list and manually authorizes the work order.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-base">Candidate Evaluation Engine</h3>
                  <span className="text-xs text-slate-400">Match breakdown for Work Order #3088</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300">
                  CCTV & Access Control
                </span>
              </div>

              {/* Candidate 1 (Top Match) */}
              <div className="p-4 rounded-xl bg-slate-900 border-2 border-cyan-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Tanvir Hasan</span>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    91% Match
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Certified CCTV & NVR Specialist · Tejgaon Zone · 0 active jobs
                </p>
                <div className="flex gap-2 text-[11px] text-emerald-400 pt-1 font-medium">
                  <span>✓ Safety Cert</span> <span>✓ Free Now</span> <span>✓ 2.1 km Away</span>
                </div>
              </div>

              {/* Candidate 2 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-sm">Mehedi Zaman</span>
                  <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    78% Match
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Security Tech · 1 active job in Banani</p>
              </div>

              {/* Ineligible Candidate */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 text-sm">Nayeem Islam</span>
                  <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                    Ineligible
                  </span>
                </div>
                <p className="text-xs text-red-400 mt-1">✕ Certification expired 12 days ago (Filtered)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Role Workspaces ───────────────────────────────── */}
      <section className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Role-Specific Consoles
            </span>
            <h2 className="text-3xl font-extrabold text-white">A tailored workspace for every stakeholder</h2>
            <p className="text-slate-400 text-sm">
              Each user role gets a dedicated dashboard engineered for their operational priorities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <span className="text-2xl mb-3 block">🏢</span>
              <h3 className="font-bold text-white text-base">Business Customer</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Submit problems across five categories, monitor technician arrival countdowns, review
                equipment history, and approve digital invoices.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <span className="text-2xl mb-3 block">📡</span>
              <h3 className="font-bold text-white text-base">Dispatcher Console</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Review incoming requests, compare technician candidates with transparent scores, enforce
                SLA countdowns, and assign jobs.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <span className="text-2xl mb-3 block">🧰</span>
              <h3 className="font-bold text-white text-base">Field Technician</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Access today's job roster, update travel and on-site progress live, manage trade
                certifications, and report work completion.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <span className="text-2xl mb-3 block">⚙️</span>
              <h3 className="font-bold text-white text-base">Administrator</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Oversee workforce staff accounts, review security audit trails, monitor SLA breach
                reports, and configure service operational boundaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Subscription Plans & Response SLAs ───────────── */}
      <section id="packages" className="py-20 lg:py-28 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Subscription Pricing & SLA
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Choose your facility service plan
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Every plan includes qualified coordination across all service categories. Response time is
            our commitment to when our technician physically arrives at your premises.
          </p>
        </div>

        {/* SLA Plain Language Clarification Box */}
        <div className="max-w-3xl mx-auto mt-8 p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs sm:text-sm text-cyan-200 flex items-start gap-3">
          <span className="text-lg shrink-0">⏱️</span>
          <div>
            <strong className="font-bold text-white">What does "Response Time" mean?</strong> Response
            time is the target window within which the assigned technician physically reaches your
            facility. It is not merely an email acknowledgment. Total repair duration depends on job
            scope and parts required.
          </div>
        </div>

        {/* 3 Package Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 mt-12 items-stretch">
          {/* Package 1: Weekly */}
          <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Weekly Plan</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Flexible Term
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ideal for short-term facility needs, seasonal commercial peaks, or project setups.
              </p>

              <div className="py-3 border-y border-slate-800/80">
                <div className="text-2xl font-extrabold text-cyan-300">Pricing to be announced</div>
                <div className="text-xs text-slate-400 mt-1">Billed weekly per site</div>
              </div>

              {/* SLA Callout */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Arrival SLA Commitment:</span>
                <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
                  Within 40 minutes on site
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Coverage across all 5 service categories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>40-minute technician arrival commitment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Human dispatcher verification on every job</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Digital job history & itemized invoices</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPackage("weekly")}
              className="mt-8 w-full py-3 rounded-xl font-semibold text-sm text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Select Weekly Plan
            </button>
          </div>

          {/* Package 2: Monthly Standard */}
          <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Monthly Standard</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Best Value
                </span>
              </div>
              <p className="text-xs text-slate-400">
                The standard operational plan for retail outlets, corporate offices, and commercial spaces.
              </p>

              <div className="py-3 border-y border-slate-800/80">
                <div className="text-2xl font-extrabold text-cyan-300">Pricing to be announced</div>
                <div className="text-xs text-emerald-400 mt-1 font-semibold">
                  ★ Discounted rate — cheaper than 4 weekly plans
                </div>
              </div>

              {/* SLA Callout */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Arrival SLA Commitment:</span>
                <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
                  Within 40 minutes on site
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Coverage across all 5 service categories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>40-minute technician arrival commitment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Priority dispatcher matching queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Equipment asset log & service timeline</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Transparent itemized billing per repair</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPackage("monthly-standard")}
              className="mt-8 w-full py-3 rounded-xl font-semibold text-sm text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Select Monthly Standard
            </button>
          </div>

          {/* Package 3: Monthly Priority (Featured) */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-cyan-400 shadow-2xl shadow-cyan-950/60 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow">
              ⚡ Rapid 20-Min Response
            </div>

            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Monthly Priority</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Critical Facilities
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Engineered for factories, high-traffic commercial spaces, and mission-critical equipment.
              </p>

              <div className="py-3 border-y border-slate-800">
                <div className="text-2xl font-extrabold text-cyan-300">Pricing to be announced</div>
                <div className="text-xs text-slate-400 mt-1">Billed monthly · 2x faster arrival SLA</div>
              </div>

              {/* SLA Callout */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40">
                <span className="text-xs text-cyan-300 block font-medium">Arrival SLA Commitment:</span>
                <span className="text-lg font-black text-white mt-0.5 block tracking-tight">
                  Within 20 minutes on site
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-white">20-minute rapid arrival target (2x faster)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Coverage across all 5 service categories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Top-tier emergency dispatcher priority</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Full asset service history & preventative alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Digital invoice archive & payment records</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPackage("monthly-priority")}
              className="mt-8 w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all"
            >
              Select Monthly Priority
            </button>
          </div>
        </div>

        {/* SLA & Plan Comparison Matrix */}
        <div className="mt-16 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Service Plan Comparison Matrix</h3>
            <p className="text-xs text-slate-400 mt-1">
              Transparent breakdown of commitments across all three subscription options.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/80 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-6">Plan Feature</th>
                  <th className="py-3.5 px-6">Weekly Plan</th>
                  <th className="py-3.5 px-6">Monthly Standard</th>
                  <th className="py-3.5 px-6 text-cyan-300">Monthly Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                <tr>
                  <td className="py-3.5 px-6 font-medium text-white">Technician Arrival SLA Target</td>
                  <td className="py-3.5 px-6 text-slate-300">Within 40 minutes</td>
                  <td className="py-3.5 px-6 text-slate-300">Within 40 minutes</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">Within 20 minutes (2x faster)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium text-white">Billing Cadence</td>
                  <td className="py-3.5 px-6">Weekly subscription</td>
                  <td className="py-3.5 px-6 font-medium text-emerald-400">Monthly (Cheaper than 4 weekly)</td>
                  <td className="py-3.5 px-6">Monthly subscription</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium text-white">Supported Categories</td>
                  <td className="py-3.5 px-6">All 5 trades</td>
                  <td className="py-3.5 px-6">All 5 trades</td>
                  <td className="py-3.5 px-6">All 5 trades</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium text-white">Dispatcher Oversight</td>
                  <td className="py-3.5 px-6">Human dispatcher</td>
                  <td className="py-3.5 px-6">Human dispatcher</td>
                  <td className="py-3.5 px-6 font-semibold text-cyan-300">Priority emergency routing</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium text-white">Asset & Service History</td>
                  <td className="py-3.5 px-6">Standard log</td>
                  <td className="py-3.5 px-6">Detailed equipment history</td>
                  <td className="py-3.5 px-6">Full multi-asset audit history</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 6: About VoltOps ─────────────────────────────────── */}
      <section id="about" className="py-20 lg:py-28 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Built For Modern Facilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Built for commercial field service coordination
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Most businesses still handle facility breakdowns through scattered WhatsApp groups, personal
              phone books, and unverified handymen. When a commercial chiller stalls, a security camera
              drops, or a generator voltage fluctuates, delays cost operational revenue.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              VoltOps replaces operational guesswork with an accountable coordination infrastructure.
              We connect business managers with vetted technicians across electrical, mechanical,
              security, IT, and facility upkeep — backed by SLA countdowns and human dispatcher
              accountability.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="text-emerald-400">✓</span> No uncertified technicians
              </div>
              <p className="text-xs text-slate-400">
                Safety credentials and trade licenses are verified before assignment eligibility.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="text-emerald-400">✓</span> No double bookings
              </div>
              <p className="text-xs text-slate-400">
                Active job workloads and transit distances prevent technician overcommitment.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="text-emerald-400">✓</span> Real accountability
              </div>
              <p className="text-xs text-slate-400">
                Customers see live technician transit, estimated arrival time, and itemized billing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Contact & Support ─────────────────────────────── */}
      <section id="contact" className="py-20 lg:py-28 max-w-7xl mx-auto px-6">
        {/* Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-brand-dark via-brand to-slate-950 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to protect your facility operations?
            </h2>
            <p className="text-sm text-cyan-200">
              Select a service plan and start submitting requests with guaranteed arrival response times.
            </p>
          </div>
          <a
            href="#packages"
            className="px-6 py-3.5 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 shrink-0 shadow-lg"
          >
            Get Started Now
          </a>
        </div>

        {/* Contact Form & Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-16">
          <div className="lg:col-span-5 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Direct Inquiries</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">Talk with our team</h2>
              <p className="text-slate-400 text-sm mt-2">
                Have specific enterprise facility questions or multiple sites across Dhaka? Send our
                team a message.
              </p>
            </div>

            <div className="space-y-3 pt-3 text-sm text-slate-300">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-cyan-400">✉️</span>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Email</span>
                  <span>support@voltops.example</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-cyan-400">📞</span>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Phone</span>
                  <span>+880 1XXX-XXXXXX</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-cyan-400">📍</span>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Coordination Center</span>
                  <span>Dhaka, Bangladesh</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Send a message</h3>

              {contactSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm">
                  ✓ Thank you! Your message has been received. Our coordination team will reply within
                  one working day.
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Karim Rahman"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Business Email</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Company / Facility Name
                    </label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Apex Galleria Ltd."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tell us about your facility locations and service requirements..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <LogoMark className="w-6 h-6 rounded-md" />
            <span className="font-semibold text-slate-300">
              © 2026 VoltOps · Subscription-based field service coordination for businesses
            </span>
          </div>
          <div>CSE 400 project, BUBT</div>
        </div>
      </footer>
    </div>
  );
}
