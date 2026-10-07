import { useState, useEffect, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

// Logo mark SVG component
function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
    </div>
  );
}

// Checkmark icon for feature lists
function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-status-available shrink-0 mt-1"
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

export function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "VoltOps | Field service workforce and service management";
  }, []);

  // 1. Sticky nav shadow on scroll
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Live-ticking SLA countdown timer: 02:41:10 = 9670 seconds
  const [slaTime, setSlaTime] = useState(9670);
  useEffect(() => {
    const timer = setInterval(() => {
      setSlaTime((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSlaTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Contact form submission state
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setContactName("");
    setContactEmail("");
    setContactMessage("");
  };

  const handleSelectPackage = (pkg: "standard" | "priority" | "enterprise") => {
    navigate(`/register?package=${pkg}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-brand selection:text-white">
      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 bg-white border-b border-gray-200 transition-shadow duration-200 ${
          isScrolled ? "shadow-md" : ""
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 font-bold text-lg text-gray-900">
            <LogoMark className="animate-pulse" />
            <span>VoltOps</span>
          </a>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 font-medium">
            <a href="#features" className="hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#how" className="hover:text-gray-900 transition-colors">
              How it works
            </a>
            <a href="#packages" className="hover:text-gray-900 transition-colors">
              Packages
            </a>
            <a href="#about" className="hover:text-gray-900 transition-colors">
              About
            </a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">
              Contact us
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="inline-block px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-semibold text-sm border border-brand text-brand hover:bg-brand/5 transition-colors"
            >
              Sign in
            </Link>
            <a
              href="#packages"
              className="inline-block px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-semibold text-sm border border-brand bg-brand text-white hover:bg-brand-dark hover:border-brand-dark transition-colors"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header>
        <section className="py-14 sm:py-18 lg:py-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold leading-[1.15] tracking-tight text-gray-900">
                The right technician, on the right job, before the deadline.
              </h1>
              <p className="text-gray-600 my-4 sm:my-6 max-w-lg text-base leading-relaxed">
                VoltOps helps field service companies — from electrical to HVAC — manage technicians, customer requests
                and field jobs in one place, and recommends the best technician for every job with
                clear reasons.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#packages"
                  className="inline-block px-5 py-2.5 rounded-lg font-semibold text-sm border border-brand bg-brand text-white hover:bg-brand-dark hover:border-brand-dark transition-colors"
                >
                  View packages
                </a>
                <a
                  href="#how"
                  className="inline-block px-5 py-2.5 rounded-lg font-semibold text-sm border border-brand text-brand hover:bg-brand/5 transition-colors"
                >
                  See how it works
                </a>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-5 mt-6 text-xs sm:text-[13px] text-gray-600">
                <span className="inline-flex items-center">
                  <span className="w-2 h-2 rounded-full bg-status-available mr-2 shrink-0"></span>
                  Certification checks
                </span>
                <span className="inline-flex items-center">
                  <span className="w-2 h-2 rounded-full bg-status-available mr-2 shrink-0"></span>
                  SLA countdowns
                </span>
                <span className="inline-flex items-center">
                  <span className="w-2 h-2 rounded-full bg-status-available mr-2 shrink-0"></span>
                  Live job updates
                </span>
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-5 mt-3 text-xs sm:text-[13px] text-gray-600">
                <span className="inline-flex items-center">
                  <span className="mr-1.5">⚡</span>
                  Electrical
                </span>
                <span className="inline-flex items-center">
                  <span className="mr-1.5">❄️</span>
                  HVAC
                </span>
                <span className="inline-flex items-center">
                  + more coming
                </span>
              </div>
            </div>

            {/* Interactive Job Card Demo */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex justify-between items-start gap-3 pb-3.5 border-b border-gray-200 mb-3.5">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    WO-1054 · ABC Manufacturing
                  </h3>
                  <small className="text-gray-500 text-xs sm:text-[12.5px] block mt-0.5">
                    500 KVA generator, unstable voltage and shutdowns
                  </small>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-200 text-status-danger bg-red-50">
                    Urgent
                  </span>
                  <br />
                  <small className="text-status-danger font-semibold text-xs mt-1 block">
                    SLA {formatSlaTime(slaTime)} left
                  </small>
                </div>
              </div>

              {/* Recommended Candidate */}
              <div className="border-2 border-brand-light rounded-lg p-3 sm:p-3.5 mt-2.5 bg-white">
                <div className="flex justify-between items-center gap-2.5">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Rahim Ahmed
                    </h3>
                    <small className="text-gray-500 text-xs sm:text-[12.5px] block">
                      Generator repair · Mirpur 10 · 0 active jobs
                    </small>
                  </div>
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200 text-status-available bg-green-50 shrink-0">
                    92% match
                  </span>
                </div>
                <small className="text-gray-500 text-xs sm:text-[12.5px] block mt-1">
                  Valid safety certificate, free now, 15 minutes from the site.
                </small>
                <div className="flex flex-wrap gap-3 text-xs text-status-available mt-1.5 font-medium">
                  <span>✓ Certified</span>
                  <span>✓ Available</span>
                  <span>✓ Nearby</span>
                  <span>✓ Low workload</span>
                </div>
                <div className="mt-2.5">
                  <Link
                    to="/login"
                    className="inline-block px-3.5 py-1.5 rounded-lg font-semibold text-xs border border-brand bg-brand text-white hover:bg-brand-dark transition-colors"
                  >
                    Assign
                  </Link>
                </div>
              </div>

              {/* Secondary Candidate */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-3.5 mt-2.5 bg-white">
                <div className="flex justify-between items-center gap-2.5">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Karim Hasan
                    </h3>
                    <small className="text-gray-500 text-xs sm:text-[12.5px] block">
                      UPS maintenance · 1 active job
                    </small>
                  </div>
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 text-status-busy bg-amber-50 shrink-0">
                    74% match
                  </span>
                </div>
              </div>

              {/* Ineligible Candidate */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-3.5 mt-2.5 bg-gray-50 opacity-65">
                <div className="flex justify-between items-center gap-2.5">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Nayeem Islam
                    </h3>
                    <small className="text-status-danger text-xs sm:text-[12.5px] block">
                      ✕ Certification expired 12 days ago
                    </small>
                  </div>
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 text-status-offline bg-gray-100 shrink-0">
                    Not eligible
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      {/* Stats Banner */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <b className="block text-2xl sm:text-3xl font-bold text-brand">24/7</b>
            <span className="text-xs sm:text-sm text-gray-600">Request tracking for customers</span>
          </div>
          <div>
            <b className="block text-2xl sm:text-3xl font-bold text-brand">4</b>
            <span className="text-xs sm:text-sm text-gray-600">Roles with their own dashboards</span>
          </div>
          <div>
            <b className="block text-2xl sm:text-3xl font-bold text-brand">100%</b>
            <span className="text-xs sm:text-sm text-gray-600">Assignments confirmed by a human</span>
          </div>
          <div>
            <b className="block text-2xl sm:text-3xl font-bold text-brand">0</b>
            <span className="text-xs sm:text-sm text-gray-600">Expired certificates sent to a job</span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Everything your service team needs
          </h2>
          <p className="text-gray-600 max-w-xl mt-2.5 text-sm sm:text-base">
            From the first customer call to the final invoice, every step lives in one system.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mt-8 sm:mt-9">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-brand-light">
              <div className="w-8.5 h-8.5 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center mb-3">
                T
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Technician profiles</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Skills, certifications with expiry dates and live availability for every electrician.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-brand-light">
              <div className="w-8.5 h-8.5 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center mb-3">
                M
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Smart technician matching</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Ranked, explained recommendations based on skill, certification, availability,
                workload and location.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-brand-light">
              <div className="w-8.5 h-8.5 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center mb-3">
                S
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Service requests and work orders</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Turn a customer problem into a trackable job with a clear status timeline.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-brand-light">
              <div className="w-8.5 h-8.5 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center mb-3">
                C
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Customers and assets</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Keep every piece of equipment — generators, transformers, HVAC units and more — with
                its service history.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-brand-light">
              <div className="w-8.5 h-8.5 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center mb-3">
                L
              </div>
              <h3 className="font-semibold text-gray-900 text-base">SLA tracking</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Live countdowns and breach warnings so no response deadline is missed.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-brand-light">
              <div className="w-8.5 h-8.5 rounded-lg bg-brand/10 text-brand font-bold flex items-center justify-center mb-3">
                $
              </div>
              <h3 className="font-semibold text-gray-900 text-base">Invoices and payments</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Exact invoices from job and parts cost, paid online with SSLCommerz or online
                banking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how" className="bg-gray-50 border-y border-gray-200 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
            How one job flows through VoltOps
          </h2>
          <p className="text-gray-600 max-w-xl mt-2.5 text-sm sm:text-base">
            Every service job follows the same path, so nothing gets lost between a phone call and a
            spreadsheet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-8 sm:mt-9">
            <div className="border-t-[3px] border-brand pt-3">
              <b className="text-brand-light text-xs sm:text-sm font-bold block">1</b>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mt-1">Customer request</h3>
              <p className="text-xs sm:text-[13.5px] text-gray-600 mt-1 leading-relaxed">
                The customer reports a problem and picks the affected asset.
              </p>
            </div>
            <div className="border-t-[3px] border-brand pt-3">
              <b className="text-brand-light text-xs sm:text-sm font-bold block">2</b>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mt-1">Technician matching</h3>
              <p className="text-xs sm:text-[13.5px] text-gray-600 mt-1 leading-relaxed">
                The system lists eligible technicians with reasons.
              </p>
            </div>
            <div className="border-t-[3px] border-brand pt-3">
              <b className="text-brand-light text-xs sm:text-sm font-bold block">3</b>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mt-1">Assignment</h3>
              <p className="text-xs sm:text-[13.5px] text-gray-600 mt-1 leading-relaxed">
                The dispatcher reviews the list and assigns the job.
              </p>
            </div>
            <div className="border-t-[3px] border-brand pt-3">
              <b className="text-brand-light text-xs sm:text-sm font-bold block">4</b>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mt-1">Service execution</h3>
              <p className="text-xs sm:text-[13.5px] text-gray-600 mt-1 leading-relaxed">
                The technician travels, works and updates status live.
              </p>
            </div>
            <div className="border-t-[3px] border-brand pt-3">
              <b className="text-brand-light text-xs sm:text-sm font-bold block">5</b>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mt-1">Completion and payment</h3>
              <p className="text-xs sm:text-[13.5px] text-gray-600 mt-1 leading-relaxed">
                The customer confirms the work and pays the invoice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recommendations & Live Status Demo */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Recommendations you can explain
            </h2>
            <p className="text-gray-600 max-w-xl mt-2.5 text-sm sm:text-base leading-relaxed">
              Eligibility and scores come from clear business rules. AI only writes the
              plain-language reason, and a manager always makes the final call.
            </p>
            <ul className="mt-5 space-y-3">
              <li className="flex items-start gap-2.5 text-gray-600 text-sm sm:text-[15px]">
                <CheckIcon />
                <span>
                  <strong className="text-gray-900 font-semibold">Hard rules first.</strong> Expired
                  certificates, leave and double-booking are filtered out.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-600 text-sm sm:text-[15px]">
                <CheckIcon />
                <span>
                  <strong className="text-gray-900 font-semibold">Transparent scoring.</strong> Skill,
                  workload and distance are weighed with simple arithmetic.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-600 text-sm sm:text-[15px]">
                <CheckIcon />
                <span>
                  <strong className="text-gray-900 font-semibold">Nothing assigned automatically.</strong> The
                  dispatcher clicks Assign.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-base">Rahim Ahmed's customer view</h3>
            <div className="border border-gray-200 rounded-lg p-3 sm:p-3.5 mt-2.5 bg-white">
              <div className="flex justify-between items-center gap-2.5">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    Your technician is on the way
                  </h3>
                  <small className="text-gray-500 text-xs sm:text-[12.5px] block mt-0.5">
                    Rahim Ahmed · arrives in about 35 minutes
                  </small>
                </div>
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 text-status-busy bg-amber-50 shrink-0">
                  En route
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4 text-xs text-gray-600 text-center">
              <div className="flex-1 border-t-4 border-status-available pt-1.5 font-medium">New</div>
              <div className="flex-1 border-t-4 border-status-available pt-1.5 font-medium">Assigned</div>
              <div className="flex-1 border-t-4 border-brand pt-1.5 text-gray-900 font-semibold">
                En route
              </div>
              <div className="flex-1 border-t-4 border-gray-200 pt-1.5">In progress</div>
              <div className="flex-1 border-t-4 border-gray-200 pt-1.5">Completed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Workspaces */}
      <section className="bg-gray-50 border-y border-gray-200 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
            A workspace for every role
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 sm:mt-9">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-base">Admin</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Manage staff, technicians and customers, and review the audit log.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-base">Dispatcher</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Review requests, compare technicians and assign jobs.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-base">Technician</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                See today's jobs, update status and set availability.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-base">Customer</h3>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                Submit requests, track progress and pay invoices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Packages */}
      <section id="packages" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Choose a service package
          </h2>
          <p className="text-gray-600 max-w-xl mt-2.5 text-sm sm:text-base">
            Pick a plan, sign in, pay online and land on your dashboard with your package details and
            receipt.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5 mt-8 sm:mt-9 items-stretch">
            {/* Standard Plan */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-brand-light">
              <h3 className="font-semibold text-gray-900 text-lg">Standard care</h3>
              <small className="text-gray-500 text-xs sm:text-sm mt-0.5">
                For small shops and offices
              </small>
              <div className="text-3xl font-bold text-gray-900 my-3">
                ৳3,500<small className="text-sm font-normal text-gray-500"> / month</small>
              </div>
              <ul className="space-y-2.5 my-4 flex-1">
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Service requests during business hours</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>8-hour response target</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Request tracking dashboard</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Digital invoices</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleSelectPackage("standard")}
                className="w-full inline-block px-5 py-2.5 rounded-lg font-semibold text-sm border border-brand text-brand hover:bg-brand/5 transition-colors cursor-pointer text-center"
              >
                Choose Standard
              </button>
            </div>

            {/* Priority Plan (Featured) */}
            <div className="bg-white border-2 border-brand rounded-xl p-6 flex flex-col transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-xl hover:border-brand-dark relative">
              <div className="flex justify-between items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-lg">Priority 24/7</h3>
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200 text-status-available bg-green-50 shrink-0">
                  Most chosen
                </span>
              </div>
              <small className="text-gray-500 text-xs sm:text-sm mt-0.5">
                For factories and critical equipment
              </small>
              <div className="text-3xl font-bold text-gray-900 my-3">
                ৳9,500<small className="text-sm font-normal text-gray-500"> / month</small>
              </div>
              <ul className="space-y-2.5 my-4 flex-1">
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Requests accepted around the clock</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>4-hour response target with SLA alerts</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Live technician status and arrival time</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Asset service history</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleSelectPackage("priority")}
                className="w-full inline-block px-5 py-2.5 rounded-lg font-semibold text-sm border border-brand bg-brand text-white hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer text-center"
              >
                Choose Priority 24/7
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-brand-light">
              <h3 className="font-semibold text-gray-900 text-lg">Enterprise</h3>
              <small className="text-gray-500 text-xs sm:text-sm mt-0.5">
                For multi-site operations
              </small>
              <div className="text-3xl font-bold text-gray-900 my-3">Custom</div>
              <ul className="space-y-2.5 my-4 flex-1">
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Multiple sites and branches</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Dedicated technician team</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Preventive maintenance reminders</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckIcon />
                  <span>Monthly service reports</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleSelectPackage("enterprise")}
                className="w-full inline-block px-5 py-2.5 rounded-lg font-semibold text-sm border border-brand text-brand hover:bg-brand/5 transition-colors cursor-pointer text-center"
              >
                Talk to us
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2.5 text-xs sm:text-[13.5px] text-gray-600">
            <span>Pay securely with</span>
            <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 text-gray-900 bg-white">
              SSLCommerz
            </span>
            <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 text-gray-900 bg-white">
              Online banking
            </span>
            <span>and get your receipt instantly. Sample prices shown.</span>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-gray-50 border-y border-gray-200 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Built for field service companies
            </h2>
            <p className="text-gray-600 max-w-xl mt-2.5 text-sm sm:text-base leading-relaxed">
              Most small and medium service providers in Bangladesh still coordinate technicians
              through phone calls and spreadsheets. VoltOps replaces that guesswork with a reliable
              system for generators, transformers, UPS systems, HVAC units and industrial equipment.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-gray-600 text-sm sm:text-[15px]">
                <CheckIcon />
                <span>
                  <strong className="text-gray-900 font-semibold">No missed certificates.</strong> Expiry
                  dates are checked on every match.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-600 text-sm sm:text-[15px]">
                <CheckIcon />
                <span>
                  <strong className="text-gray-900 font-semibold">No double bookings.</strong> Conflicts
                  are caught before assignment.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-600 text-sm sm:text-[15px]">
                <CheckIcon />
                <span>
                  <strong className="text-gray-900 font-semibold">No surprises.</strong> Customers see
                  who is coming and when.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-brand text-white rounded-xl p-8 sm:p-11 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-white">
                Ready to simplify your field operations?
              </h2>
              <p className="text-[#cfe0e6] mt-1.5 text-sm sm:text-base">
                Choose a package and get your dashboard in minutes.
              </p>
            </div>
            <a
              href="#packages"
              className="inline-block px-5 py-2.5 rounded-lg font-semibold text-sm bg-white text-brand border border-white hover:bg-gray-100 transition-colors shrink-0"
            >
              Get started
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-14">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-gray-900">
                Contact us
              </h2>
              <p className="text-gray-600 max-w-xl mt-2.5 text-sm sm:text-base leading-relaxed">
                Questions about packages or setup? Send a message and we will reply within one
                working day.
              </p>
              <div className="mt-5 space-y-3 text-sm text-gray-600">
                <div>
                  <b className="block text-gray-900 font-semibold">Email</b>
                  <span>support@voltops.example</span>
                </div>
                <div>
                  <b className="block text-gray-900 font-semibold">Phone</b>
                  <span>+880 1XXX-XXXXXX</span>
                </div>
                <div>
                  <b className="block text-gray-900 font-semibold">Office</b>
                  <span>Dhaka, Bangladesh</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-base mb-2">Send a message</h3>
              {contactSubmitted ? (
                <div className="bg-green-50 border border-green-200 text-status-available text-sm rounded-lg p-4">
                  Thank you! Your message has been received. We will reply within one working day.
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-light"
                  />
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-light"
                  />
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="How can we help?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-light"
                  ></textarea>
                  <div className="pt-1">
                    <button
                      type="submit"
                      className="inline-block px-5 py-2.5 rounded-lg font-semibold text-sm border border-brand bg-brand text-white hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
                    >
                      Send message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand text-[#cfe0e6] py-7 text-xs sm:text-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <span>© 2026 VoltOps · Field service workforce management</span>
          <span>CSE 400 project, BUBT</span>
        </div>
      </footer>
    </div>
  );
}
