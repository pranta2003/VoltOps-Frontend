import { useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { ServiceRequest, WorkOrder, CANONICAL_SERVICE_CATEGORIES } from "../types";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  WrenchIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "../components/Icons";

// ── Mock Seed Data strictly aligned with Figma & AGENTS.md ───────────────
const INITIAL_REQUESTS: ServiceRequest[] = [
  {
    id: "SR-001",
    customerId: "cust-1",
    customerName: "ABC Manufacturing Ltd",
    facilityAddress: "Plot 42, Sector 7, Export Processing Zone, Dhaka",
    contactPhone: "+880 1711-002233",
    category: "Electrical and power systems",
    assetName: "Transformer T-04 (500kVA)",
    problemTitle: "Overheating Transformer & Severe Voltage Fluctuation",
    problemDescription:
      "Main substation transformer operating temperature spiked past 85°C with severe audible buzzing. Phase B voltage dropping intermittently under production load.",
    priority: "URGENT",
    status: "NEW",
    submittedAt: "2026-11-10T09:14:00Z",
    preferredDateTime: "Immediate / ASAP",
    slaRemainingMinutes: 38,
  },
  {
    id: "SR-002",
    customerId: "cust-2",
    customerName: "Apex Footwear Logistics Hub",
    facilityAddress: "Building 3, Central Distribution Center, Gazipur",
    contactPhone: "+880 1819-445566",
    category: "AC, HVAC, and cooling",
    assetName: "Central Chiller Unit #2",
    problemTitle: "Chiller Refrigerant Low Pressure & Auto-Shutdown",
    problemDescription:
      "Compressor tripping on safety interlock. Ambient server room temperatures rising to 27°C. Critical cooling required for IT distribution rack.",
    priority: "HIGH",
    status: "REVIEWING",
    submittedAt: "2026-11-10T10:05:00Z",
    preferredDateTime: "Today before 2:00 PM",
    slaRemainingMinutes: 95,
  },
  {
    id: "SR-003",
    customerId: "cust-3",
    customerName: "Square Textile Mill #4",
    facilityAddress: "KM 28, Dhaka-Mymensingh Highway, Bhaluka",
    contactPhone: "+880 1912-778899",
    category: "CCTV and security",
    assetName: "Perimeter Surveillance Node 08",
    problemTitle: "Perimeter Camera Optical Link Disconnected",
    problemDescription:
      "Fiber transceiver link down for western boundary PTZ cameras. Live feed lost on security operations console.",
    priority: "MEDIUM",
    status: "NEW",
    submittedAt: "2026-11-10T11:20:00Z",
    preferredDateTime: "Today evening",
  },
  {
    id: "SR-004",
    customerId: "cust-1",
    customerName: "ABC Manufacturing Ltd",
    facilityAddress: "Plot 42, Sector 7, Export Processing Zone, Dhaka",
    contactPhone: "+880 1711-002233",
    category: "Internet, networking, and hardware",
    assetName: "Core Switch Rack SW-01",
    problemTitle: "Switch Port Flapping & SFP Module Error",
    problemDescription:
      "Production floor VLAN losing uplink packets every 3 minutes. Suspected degraded SFP fiber patch or transceiver thermal throttling.",
    priority: "LOW",
    status: "CONVERTED",
    submittedAt: "2026-11-10T08:30:00Z",
    workOrderId: "WO-1024",
  },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: "WO-1024",
    requestId: "SR-004",
    customerName: "ABC Manufacturing Ltd",
    facilityAddress: "Plot 42, Sector 7, Export Processing Zone, Dhaka",
    category: "Internet, networking, and hardware",
    assetName: "Core Switch Rack SW-01",
    problemSummary: "Switch Port Flapping & SFP Module Error",
    priority: "LOW",
    status: "UNASSIGNED",
    slaDeadline: "2026-11-10T16:00:00Z",
    createdAt: "2026-11-10T09:00:00Z",
  },
  {
    id: "WO-1021",
    requestId: "SR-1021",
    customerName: "Beximco Industrial Park",
    facilityAddress: "Sarabo, Kashimpur, Gazipur",
    category: "Electrical and power systems",
    assetName: "Standby Generator G-01",
    problemSummary: "Automatic Transfer Switch (ATS) Failure",
    priority: "URGENT",
    status: "TRAVELLING",
    assignedTechnicianId: "tech-1",
    assignedTechnicianName: "Kamrul Islam (Certified Master Electrician)",
    slaDeadline: "2026-11-10T11:45:00Z",
    createdAt: "2026-11-10T10:15:00Z",
  },
  {
    id: "WO-1018",
    requestId: "SR-1018",
    customerName: "Rahimafrooz Facility Hub",
    facilityAddress: "Tejgaon Industrial Area, Dhaka",
    category: "Plumbing and water systems",
    assetName: "Booster Water Pump P-03",
    problemSummary: "Main Pressure Seal Failure & Rapid Leakage",
    priority: "HIGH",
    status: "ON_SITE",
    assignedTechnicianId: "tech-2",
    assignedTechnicianName: "Tanvir Ahmed (Commercial Pipe & Fluid Specialist)",
    slaDeadline: "2026-11-10T12:30:00Z",
    createdAt: "2026-11-10T09:45:00Z",
  },
];

// Candidates for dispatch assignment
interface CandidateTech {
  id: string;
  name: string;
  designation: string;
  category: string;
  status: "AVAILABLE" | "ON_JOB" | "OFF_DUTY";
  etaMinutes: number;
  matchScore: number;
  skills: string[];
  certifications: string[];
  explanation: string;
}

const CANDIDATE_TECHNICIANS: CandidateTech[] = [
  {
    id: "tech-3",
    name: "Rafiqul Hasan",
    designation: "Senior Substation & HV Technician",
    category: "Electrical and power systems",
    status: "AVAILABLE",
    etaMinutes: 18,
    matchScore: 96,
    skills: ["High Voltage Panels", "Transformer Thermography", "Breaker Testing"],
    certifications: ["BEE Grade-A Substation License", "NFPA 70E Arc Flash Certified"],
    explanation:
      "Highest arithmetic match score (96%). Possesses active Grade-A substation certification, zero active jobs in current shift, and location is within 18 minutes of the facility.",
  },
  {
    id: "tech-4",
    name: "Shahidul Alam",
    designation: "Power & Automation Specialist",
    category: "Electrical and power systems",
    status: "AVAILABLE",
    etaMinutes: 26,
    matchScore: 84,
    skills: ["Industrial Switchgear", "Generator Synchronizing", "PLC Faults"],
    certifications: ["ABC Electrical Licensing Board Supervisor"],
    explanation:
      "Strong match score (84%). Verified switchgear expertise, currently on standby at the Uttara branch hub with a 26-minute arrival estimate.",
  },
];

export function DispatcherDashboard() {
  const [requests] = useState<ServiceRequest[]>(INITIAL_REQUESTS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [activeTab, setActiveTab] = useState<"ALL" | "URGENT" | "ACTIVE">("ALL");

  // Assignment Modal State
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [assignedSuccess, setAssignedSuccess] = useState<string | null>(null);

  // Compute operational metrics
  const metrics = useMemo(() => {
    const totalRequests = requests.length;
    const openOrders = workOrders.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED").length;
    const urgentCount = requests.filter((r) => r.priority === "URGENT" && r.status === "NEW").length;
    const availableTechs = 6;
    return { totalRequests, openOrders, urgentCount, availableTechs };
  }, [requests, workOrders]);

  const handleAssignTechnician = (tech: CandidateTech) => {
    if (!selectedWorkOrder) return;
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === selectedWorkOrder.id
          ? {
              ...wo,
              status: "ASSIGNED",
              assignedTechnicianId: tech.id,
              assignedTechnicianName: `${tech.name} (${tech.designation})`,
            }
          : wo
      )
    );
    setAssignedSuccess(`Successfully dispatched ${tech.name} to ${selectedWorkOrder.id}`);
    setTimeout(() => {
      setSelectedWorkOrder(null);
      setAssignedSuccess(null);
    }, 1500);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-bold";
      case "HIGH":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "LOW":
      default:
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNASSIGNED":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "ASSIGNED":
      case "TRAVELLING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "ON_SITE":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <Layout
      title="Dispatcher Operations Console"
      subtitle="Figma Source: Frame 1 (1440 × 1024px) · Real-time breakdown queue & technician allocation"
    >
      {/* ── Metric Cards (Figma: Row of 4 cards) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Incoming Today</span>
            <AlertTriangleIcon size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
            {metrics.totalRequests}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Commercial service requests</div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Active Work Orders</span>
            <WrenchIcon size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
            {metrics.openOrders}
          </div>
          <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">In dispatch & transit</div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Available Techs</span>
            <ShieldCheckIcon size={16} className="text-[#10b981]" />
          </div>
          <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)] text-[#10b981]">
            {metrics.availableTechs}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Verified licensed staff on shift</div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
            <span>Urgent SLA Watch</span>
            <ClockIcon size={16} className="text-red-500" />
          </div>
          <div className="mt-2 text-3xl font-bold font-heading text-red-600 dark:text-red-400">
            {metrics.urgentCount}
          </div>
          <div className="mt-1 text-xs text-red-600/80 font-medium">Within 20–40m arrival target</div>
        </div>
      </div>

      {/* ── Urgent Requests Alert Box (Observed in Frame 1) ───────────────── */}
      {requests.some((r) => r.priority === "URGENT" && r.status === "NEW") && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-600 flex items-center justify-center shrink-0 font-bold">
              ⚡
            </div>
            <div>
              <div className="text-sm font-bold text-red-900 dark:text-red-200">
                Action Required: Urgent Service Request ({requests[0].id})
              </div>
              <div className="text-xs text-red-800 dark:text-red-300">
                {requests[0].customerName} · {requests[0].problemTitle} ({requests[0].slaRemainingMinutes}m SLA arrival target remaining)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              // Convert and assign action
              setSelectedWorkOrder(workOrders[0]);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all shrink-0"
          >
            Review & Assign Tech
          </button>
        </div>
      )}

      {/* ── Active Work Orders Table (Figma Frame 1 center table) ─────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-base text-[var(--text-primary)]">
              Work Order Operational Board
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time technician tracking and physical arrival SLA countdowns
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-xs">
            {(["ALL", "URGENT", "ACTIVE"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer & Location</th>
                <th className="py-3 px-4">Trade & Asset</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                    {wo.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[var(--text-primary)]">{wo.customerName}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                      {wo.facilityAddress}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[var(--text-primary)]">{wo.assetName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{wo.category}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${getPriorityBadge(
                        wo.priority
                      )}`}
                    >
                      {wo.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                        wo.status
                      )}`}
                    >
                      {wo.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {wo.assignedTechnicianName ? (
                      <span className="font-medium text-[var(--text-primary)]">
                        {wo.assignedTechnicianName}
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold italic">Unassigned · Needs tech</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {wo.status === "UNASSIGNED" ? (
                      <button
                        type="button"
                        onClick={() => setSelectedWorkOrder(wo)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
                      >
                        Assign
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedWorkOrder(wo)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Technician Candidate Matching Modal (Core SDP Milestone 4 & 5) ─ */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10b981]">
                  Matching Engine Recommendation
                </span>
                <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                  Assign Technician to {selectedWorkOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Target Breakdown Summary */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs space-y-1">
              <div>
                <strong className="text-[var(--text-primary)]">Customer:</strong> {selectedWorkOrder.customerName}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Required Trade:</strong> {selectedWorkOrder.category}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Equipment / Problem:</strong> {selectedWorkOrder.assetName} — {selectedWorkOrder.problemSummary}
              </div>
            </div>

            {assignedSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {assignedSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Eligible Candidate Technicians (Ranked by Arithmetic Match Score)
                </div>

                {CANDIDATE_TECHNICIANS.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 rounded-2xl border border-[var(--border)] hover:border-[#10b981] bg-[var(--bg-surface)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{tech.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                          {tech.matchScore}% Score
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">· ETA ~{tech.etaMinutes}m</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{tech.designation}</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1">
                        "{tech.explanation}"
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tech.certifications.map((cert) => (
                          <span
                            key={cert}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border)]"
                          >
                            ✓ {cert}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAssignTechnician(tech)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm shrink-0"
                    >
                      Confirm Assignment
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
