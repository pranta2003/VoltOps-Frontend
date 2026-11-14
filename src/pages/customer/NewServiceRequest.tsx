import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import {
  CANONICAL_SERVICE_CATEGORIES,
  ServiceCategory,
  PriorityLevel,
  CoveragePlanId,
  APPROVED_COVERAGE_PLANS,
} from "../../types";
import { customerService } from "../../services/customerService";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
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

  // Subscription Allowance state - automatically inherits customer's active plan
  const subscription = customerService.getSubscription(user?.id);
  const activePlan = subscription.planId;

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

  const planInfo = activePlan ? APPROVED_COVERAGE_PLANS[activePlan] : null;

  return (
    <Layout
      title="Submit Service Request"
      subtitle="Log a commercial equipment breakdown across our 7 certified trades"
    >
      <div className="max-w-4xl mx-auto">
        {submittedSuccess ? (
          <div className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[#10b981] text-[#06090e] font-extrabold text-2xl mx-auto flex items-center justify-center">
              ✓
            </div>
            <h2 className="font-heading font-bold text-2xl text-[var(--text-primary)]">
              Service Request Logged Successfully
            </h2>
            <div className="inline-block px-4 py-1.5 rounded-full font-mono font-bold text-sm bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
              Assigned Tracking ID: {createdRequestId || "SR-NEW"}
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Routed to active dispatcher queue under{" "}
              <strong className="text-[var(--text-primary)] font-semibold">
                {planInfo ? planInfo.name : "Active Coverage"}
              </strong>.{" "}
              {planInfo?.isGuaranteedSla
                ? `Guaranteed ${planInfo.physicalArrivalSlaMinutes}-minute arrival SLA is active.`
                : "Scheduled under active facility coverage."}
            </p>
            <div className="pt-2 text-xs font-semibold text-[#10b981]">
              Redirecting to request tracker...
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-8"
          >
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
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

            {/* ── Subscription Service-Credit Policy Banner ─────────────── */}
            {subscription.needsConfiguration && (
              <div className="p-4 rounded-2xl border border-slate-500/30 bg-slate-500/10 text-xs space-y-2">
                <div className="flex items-start gap-2 text-slate-800 dark:text-slate-300 font-bold">
                  <AlertTriangleIcon size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>Negotiated Visit Allowance Awaiting Confirmation</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  Your commercial plan uses a negotiated visit allowance that is awaiting confirmation. Included usage cannot be calculated until your negotiated allowance is configured. Standard submissions are held, but you can proceed immediately by submitting an additional on-demand service quotation pack.
                </p>
                <div className="pt-1">
                  {requestAsQuotation ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                      <span>✓ Additional Service Pack Quotation Mode Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRequestAsQuotation(true)}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#10b981] hover:bg-[#059669] text-[#06090e] transition-all shadow-sm"
                    >
                      Request Additional Service Pack (Quotation Mode)
                    </button>
                  )}
                </div>
              </div>
            )}

            {subscription.isExhausted && !subscription.needsConfiguration && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300 font-bold">
                  <AlertTriangleIcon size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>Monthly Service Visit Allowance Exhausted ({subscription.includedVisits} of {subscription.includedVisits} Used)</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  Standard included service requests are locked for the remainder of this cycle (resets {subscription.billingCycleResetDate}).
                  You can proceed by submitting an additional on-demand service quotation pack.
                </p>
                <div className="pt-1">
                  {requestAsQuotation ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                      <span>✓ Additional Service Pack Quotation Mode Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRequestAsQuotation(true)}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm"
                    >
                      Request Additional Service Pack (Quotation Mode)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── 1. Canonical Service Trade Selection ─────────────────── */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--text-muted)]">
                1. Service Trade <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {CANONICAL_SERVICE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-3.5 rounded-2xl border text-left text-xs font-semibold transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "border-[#10b981] bg-[#10b981]/10 text-[var(--text-primary)] shadow-sm font-bold ring-1 ring-[#10b981]"
                          : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <span className="text-[#10b981] font-bold">⚡</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 2. Facility Asset Selector ────────────────────────────── */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-muted)]">
                2. Facility Asset <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-sm focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none"
              >
                {CUSTOMER_ASSETS.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </select>
            </div>

            {/* ── 3. Problem Summary & Description ──────────────────────── */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  3. Problem Summary <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overheating Transformer & Severe Voltage Fluctuation"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-sm focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  Description & Symptoms <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe visible alarms, temperatures, tripping breakers, or operational impact on your facility..."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-sm focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* ── 4. Active Subscription Coverage (Inherited Automatically) ── */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-muted)]">
                4. Facility Coverage Plan
              </label>
              {subscription.hasActiveSubscription && activePlan ? (
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheckIcon size={18} className="text-[#10b981]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-heading text-[var(--text-primary)]">
                          Active Coverage: {subscription.planName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {activePlan === "247-priority"
                            ? "20-minute arrival SLA"
                            : activePlan === "247-standard"
                            ? "40-minute arrival SLA"
                            : activePlan === "8hr"
                            ? "8-Hour daily window"
                            : "Negotiated SLA"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Guaranteed arrival window automatically inherited from your facility subscription.
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
                      {subscription.remainingVisits !== null
                        ? `${subscription.remainingVisits} of ${subscription.includedVisits} visits remaining`
                        : "Negotiated Allowance"}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Resets {subscription.billingCycleResetDate}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangleIcon size={18} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                        Subscription Required
                      </span>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        An active commercial coverage plan is required to submit a service request.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/#packages"
                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shrink-0 self-start sm:self-auto shadow-sm"
                  >
                    Choose a Plan
                  </Link>
                </div>
              )}
            </div>

            {/* ── 5. Urgency Level ──────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  5. Urgency Level <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">Operational severity</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { level: "URGENT", label: "Urgent", sub: "Critical outage / halted", color: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300" },
                  { level: "HIGH", label: "High", sub: "Impending shutdown risk", color: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
                  { level: "MEDIUM", label: "Medium", sub: "Operational disruption", color: "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
                  { level: "LOW", label: "Low", sub: "Routine check / non-urgent", color: "border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300" },
                ].map(({ level, label, sub, color }) => {
                  const isChecked = priority === level;
                  return (
                    <label
                      key={level}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isChecked
                          ? `${color} ring-1 ring-current font-bold shadow-sm`
                          : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">{label}</span>
                        <input
                          type="radio"
                          name="priority"
                          value={level}
                          checked={isChecked}
                          onChange={() => setPriority(level as PriorityLevel)}
                          className="accent-[#10b981]"
                        />
                      </div>
                      <span className="text-[11px] opacity-80">{sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ── 6. Preferred Timing ───────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-sm focus:border-[#10b981] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  Preferred Time Window
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="Immediate / ASAP or Specific Shift"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-sm focus:border-[#10b981] outline-none"
                />
              </div>
            </div>

            {/* ── Form Actions ─────────────────────────────────────────── */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
              <Link
                to="/customer"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || ((subscription.isExhausted || subscription.needsConfiguration) && !requestAsQuotation)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? "Dispatching..."
                    : (subscription.isExhausted || subscription.needsConfiguration) && !requestAsQuotation
                    ? (subscription.needsConfiguration ? "Allowance Unconfigured" : "Allowance Exhausted")
                    : requestAsQuotation
                    ? "Submit Quotation Request"
                    : "Submit Service Request"}
                </span>
                <ArrowRightIcon size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
