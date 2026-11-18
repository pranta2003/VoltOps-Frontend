import { useState, useEffect, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import {
  CANONICAL_SERVICE_CATEGORIES,
  ServiceCategory,
  PriorityLevel,
  CoveragePlanId,
  APPROVED_COVERAGE_PLANS,
  ServiceRequest,
} from "../../types";
import { customerService } from "../../services/customerService";
import { operationalStore } from "../../services/operationalStore";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  LockIcon,
} from "../../components/Icons";

const CUSTOMER_ASSETS = [
  "Standby Generator G-01 (Cummins 250kVA)",
  "Main Substation Transformer T-04 (500kVA)",
  "Central Chiller Unit #2 (Carrier 120TR)",
  "Core Network Switch Rack SW-01",
  "Perimeter CCTV Optical Node 08",
  "Water Booster Pump P-03",
  "Server Room Precision AC Unit PAC-01",
  "Other / Unlisted Commercial Asset",
];

export function NewServiceRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active requests state for Single Active Request Rule
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchRequests = () => {
      customerService
        .getRequests(user?.id)
        .then((res) => {
          if (mounted) {
            setRequests(res.data);
            setIsLoadingRequests(false);
          }
        })
        .catch(() => {
          if (mounted) setIsLoadingRequests(false);
        });
    };

    fetchRequests();
    const unsubscribe = operationalStore.subscribe(fetchRequests);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  const workOrders = operationalStore.getWorkOrders();
  const activeRequest = requests.find((r) => {
    if (r.status === "CANCELLED" || r.status === "RESOLVED") return false;
    if (r.status === "CONVERTED" || r.workOrderId) {
      const wo = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);
      return wo ? wo.status !== "COMPLETED" && wo.status !== "CANCELLED" : false;
    }
    return true;
  });
  const hasActiveRequest = Boolean(activeRequest);

  // Subscription Allowance state - automatically inherits customer's active plan
  const subscription = customerService.getSubscription(user?.id);
  const activePlan = subscription.planId;
  const planInfo = activePlan ? APPROVED_COVERAGE_PLANS[activePlan] : null;

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("Electrical and power systems");
  const [selectedAsset, setSelectedAsset] = useState<string>(CUSTOMER_ASSETS[0]);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("URGENT");
  const [preferredDate, setPreferredDate] = useState("2026-11-12");
  const [preferredTime, setPreferredTime] = useState("Immediate / ASAP");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestAsQuotation, setRequestAsQuotation] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (hasActiveRequest) {
      setErrorMessage("Cannot submit while an active service request is in progress.");
      return;
    }

    if (!subscription.hasActiveSubscription || !activePlan) {
      setErrorMessage(
        "An active subscription is required to submit a commercial service request. Please choose a coverage plan to proceed."
      );
      return;
    }

    if (subscription.needsConfiguration && !requestAsQuotation) {
      setErrorMessage(
        "Your enterprise account uses a negotiated visit allowance awaiting confirmation. Please select 'Request Additional Service Pack' to submit as a quotation, or contact your account manager."
      );
      return;
    }

    if (subscription.isExhausted && !requestAsQuotation) {
      setErrorMessage(
        `Monthly service visit allowance exhausted (${subscription.includedVisits} of ${subscription.includedVisits} used). Please select 'Request Additional Service Pack' to submit as a quotation.`
      );
      return;
    }

    if (!problemTitle.trim()) {
      setErrorMessage("Please enter a descriptive problem title.");
      return;
    }
    if (!problemDescription.trim()) {
      setErrorMessage("Please describe the facility problem symptoms and location.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await customerService.createRequest(
        {
          category: selectedCategory,
          assetName: selectedAsset,
          problemTitle: problemTitle.trim(),
          problemDescription: problemDescription.trim(),
          priority,
          preferredDateTime: `${preferredDate} ${preferredTime}`,
          coveragePlan: activePlan,
          isAdditionalPaidQuotation: requestAsQuotation,
        },
        {
          id: user?.id,
          name: user?.name,
          address: user?.company || "Apex Spinning & Weaving Mills, Savar",
          coveragePlan: activePlan,
        }
      );

      setCreatedRequestId(res.data.id);
      setIsSubmitting(false);
      setSubmittedSuccess(true);

      setTimeout(() => {
        navigate("/customer");
      }, 2000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Failed to submit service request. Please check inputs and retry.");
    }
  };

  const slaSummary =
    activePlan === "247-priority"
      ? "24/7 Priority · 20m Arrival SLA"
      : activePlan === "247-standard"
      ? "24/7 Standard · 40m Arrival SLA"
      : activePlan === "8hr"
      ? "Plan A · 8h Daily Window"
      : `${subscription.planName} · Negotiated SLA`;

  return (
    <Layout title="New Service Request">
      <div className="max-w-4xl mx-auto pb-24">
        {hasActiveRequest && activeRequest ? (
          /* Focused Single Active Request Blocker Card */
          <div className="p-8 rounded-xl border border-slate-300 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.10)] dark:shadow-lg text-center space-y-5">
            <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-300/80 dark:border-white/10 text-slate-600 dark:text-zinc-400 mx-auto flex items-center justify-center">
              <LockIcon size={24} className="text-slate-600 dark:text-zinc-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading font-bold text-xl text-slate-900 dark:text-zinc-50 tracking-tight">
                Active Service Request In Progress
              </h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                To guarantee rapid technician dispatch and strict physical SLA compliance, each facility is limited to one active request at a time.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-zinc-950/80 border border-slate-300/80 dark:border-white/5 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-700 dark:text-[#10b981]">{activeRequest.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20">
                  {activeRequest.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="font-semibold text-slate-950 dark:text-zinc-200 truncate">
                {activeRequest.problemTitle}
              </div>
              <div className="text-[11px] text-slate-700 dark:text-zinc-400 truncate font-medium">
                Asset: {activeRequest.assetName} · {activeRequest.category}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center">
              <Link
                to="/customer"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#10b981] dark:text-zinc-950 dark:hover:bg-[#34d399] transition-all shadow-sm"
              >
                <span>View Active Request</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        ) : submittedSuccess ? (
          <div className="p-8 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-center space-y-4 animate-fade-in shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#10b981] text-zinc-950 font-extrabold text-2xl mx-auto flex items-center justify-center">
              ✓
            </div>
            <h2 className="font-heading font-bold text-2xl text-zinc-950 dark:text-zinc-50">
              Service Request Logged Successfully
            </h2>
            <div className="inline-block px-4 py-1.5 rounded-full font-mono font-bold text-sm bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#10b981]/20 dark:text-[#10b981] dark:border-[#10b981]/30">
              Assigned Tracking ID: {createdRequestId || "SR-NEW"}
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-400 max-w-md mx-auto">
              Routed to active dispatcher queue under{" "}
              <strong className="text-zinc-950 dark:text-zinc-100 font-semibold">
                {planInfo ? planInfo.name : "Active Coverage"}
              </strong>.{" "}
              {planInfo?.isGuaranteedSla
                ? `Guaranteed ${planInfo.physicalArrivalSlaMinutes}-minute arrival SLA is active.`
                : "Scheduled under active facility coverage."}
            </p>
            <div className="pt-2 text-xs font-semibold text-emerald-700 dark:text-[#10b981]">
              Redirecting to request tracker…
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-xl border border-slate-300 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.10)] space-y-7"
          >
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 text-xs flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="font-bold underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Subscription Service-Credit Policy Banner */}
            {subscription.needsConfiguration && (
              <div className="p-4 rounded-xl border border-slate-300/80 dark:border-zinc-700/60 bg-slate-100 dark:bg-zinc-950/60 text-xs space-y-2">
                <div className="flex items-start gap-2 text-slate-900 dark:text-zinc-200 font-bold">
                  <AlertTriangleIcon size={16} className="text-[#9d1d66] dark:text-[#b8287a] shrink-0 mt-0.5" />
                  <span>Negotiated Visit Allowance Awaiting Confirmation</span>
                </div>
                <p className="text-slate-700 dark:text-zinc-400">
                  Your commercial plan uses a negotiated visit allowance that is awaiting confirmation. Included usage cannot be calculated until your negotiated allowance is configured. Standard submissions are held, but you can proceed immediately by submitting an additional on-demand service quotation pack.
                </p>
                <div className="pt-1">
                  {requestAsQuotation ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#10b981]/20 dark:text-[#10b981] dark:border-[#10b981]/40">
                      <span>✓ Additional Service Pack Quotation Mode Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRequestAsQuotation(true)}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#10b981] dark:hover:bg-[#059669] dark:text-zinc-950 transition-all shadow-sm"
                    >
                      Request Additional Service Pack (Quotation Mode)
                    </button>
                  )}
                </div>
              </div>
            )}

            {subscription.isExhausted && !subscription.needsConfiguration && (
              <div className="p-4 rounded-xl border border-[#b8287a]/30 bg-[#b8287a]/10 dark:border-[#b8287a]/40 dark:bg-[#b8287a]/10 text-xs space-y-2">
                <div className="flex items-start gap-2 text-[#9d1d66] dark:text-[#f472b6] font-bold">
                  <AlertTriangleIcon size={16} className="text-[#9d1d66] dark:text-[#b8287a] shrink-0 mt-0.5" />
                  <span>Monthly Service Visit Allowance Exhausted ({subscription.includedVisits} of {subscription.includedVisits} Used)</span>
                </div>
                <p className="text-slate-800 dark:text-zinc-300">
                  Standard included service requests are locked for the remainder of this cycle (resets {subscription.billingCycleResetDate}).
                  You can proceed by submitting an additional on-demand service quotation pack.
                </p>
                <div className="pt-1">
                  {requestAsQuotation ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#10b981]/20 dark:text-[#10b981] dark:border-[#10b981]/40">
                      <span>✓ Additional Service Pack Quotation Mode Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRequestAsQuotation(true)}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#b8287a] hover:bg-[#991b65] text-white transition-all shadow-sm"
                    >
                      Request Additional Service Pack (Quotation Mode)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 1. Canonical Service Trade Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                1. Service Trade <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {CANONICAL_SERVICE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "border-2 border-emerald-500 bg-emerald-50/80 dark:bg-[#10b981]/10 text-emerald-950 dark:text-zinc-50 shadow-xs font-semibold ring-1 ring-emerald-500"
                          : "border border-slate-300 bg-white text-slate-800 shadow-xs hover:border-slate-400 hover:text-slate-950 hover:bg-slate-50 dark:border-white/5 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-white/10 dark:hover:text-zinc-200"
                      }`}
                    >
                      <WrenchIcon size={14} className="text-[#10b981] shrink-0 mt-0.5" />
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Facility Asset Selector */}
            <div className="space-y-2">
              <label htmlFor="asset-select" className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                2. Facility Asset <span className="text-rose-500">*</span>
              </label>
              <select
                id="asset-select"
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-slate-950 dark:text-zinc-50 text-xs sm:text-sm shadow-xs focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              >
                {CUSTOMER_ASSETS.map((asset) => (
                  <option key={asset} value={asset} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">
                    {asset}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Problem Summary & Description */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="problem-title" className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                  3. Problem Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  id="problem-title"
                  type="text"
                  required
                  placeholder="e.g. Overheating Transformer & Severe Voltage Fluctuation…"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-slate-950 dark:text-zinc-50 text-xs sm:text-sm placeholder:text-slate-500 dark:placeholder:text-zinc-500 shadow-xs focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="problem-desc" className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                  Description & Symptoms <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="problem-desc"
                  rows={4}
                  required
                  placeholder="Describe visible alarms, temperatures, tripping breakers, or operational impact on your facility…"
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-slate-950 dark:text-zinc-50 text-xs sm:text-sm placeholder:text-slate-500 dark:placeholder:text-zinc-500 shadow-xs focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none leading-relaxed transition-colors"
                />
              </div>
            </div>

            {/* 4. Urgency Level (Operational Severity Subtitle Purged) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                4. Urgency Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {[
                  { level: "URGENT", label: "Urgent", sub: "Critical outage / halted", color: "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500" },
                  { level: "HIGH", label: "High", sub: "Impending shutdown risk", color: "border-[#b8287a]/30 dark:border-[#b8287a]/40 bg-[#b8287a]/10 dark:bg-[#b8287a]/10 text-[#8a1858] dark:text-[#f472b6] ring-1 ring-[#b8287a]" },
                  { level: "MEDIUM", label: "Medium", sub: "Operational disruption", color: "border-cyan-300 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 ring-1 ring-cyan-500" },
                  { level: "LOW", label: "Low", sub: "Routine check / non-urgent", color: "border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800/40 text-slate-800 dark:text-zinc-300 ring-1 ring-slate-400 dark:ring-zinc-500" },
                ].map(({ level, label, sub, color }) => {
                  const isChecked = priority === level;
                  return (
                    <label
                      key={level}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isChecked
                          ? `${color} font-bold shadow-sm`
                          : "border-slate-300 dark:border-white/5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-400 hover:border-slate-400 dark:hover:border-white/10 hover:text-slate-950 dark:hover:text-zinc-300 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold">{label}</span>
                        <input
                          type="radio"
                          name="priority"
                          value={level}
                          checked={isChecked}
                          onChange={() => setPriority(level as PriorityLevel)}
                          className="accent-[#10b981]"
                        />
                      </div>
                      <span className="text-[11px] text-slate-600 dark:opacity-80">{sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 5. Preferred Timing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="pref-date" className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                  Preferred Date
                </label>
                <input
                  id="pref-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-slate-950 dark:text-zinc-50 text-xs sm:text-sm shadow-xs focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pref-time" className="block text-xs font-semibold text-slate-900 dark:text-zinc-300">
                  Preferred Time Window
                </label>
                <input
                  id="pref-time"
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="Immediate / ASAP or Specific Shift…"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 text-slate-950 dark:text-zinc-50 text-xs sm:text-sm placeholder:text-slate-500 dark:placeholder:text-zinc-500 shadow-xs focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Form Actions: Compact 1-line Plan SLA Summary + Submit */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-400">
                <ShieldCheckIcon size={15} className="text-[#10b981] shrink-0" />
                <span className="font-semibold text-slate-950 dark:text-zinc-300">{slaSummary}</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Link
                  to="/customer"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/10 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || ((subscription.isExhausted || subscription.needsConfiguration) && !requestAsQuotation)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#10b981] dark:text-zinc-950 dark:hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>
                    {isSubmitting
                      ? "Dispatching…"
                      : (subscription.isExhausted || subscription.needsConfiguration) && !requestAsQuotation
                      ? (subscription.needsConfiguration ? "Allowance Unconfigured" : "Allowance Exhausted")
                      : requestAsQuotation
                      ? "Submit Quotation Request"
                      : "Submit Service Request"}
                  </span>
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
