import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  COVERAGE_PLANS,
  getCoveragePlanPricing,
  formatBdt,
  CoveragePlanId,
} from "../../config/coveragePricing";
import { operationalStore } from "../../services/operationalStore";
import { CustomerPurchase } from "../../types";
import { DemonstrationReceiptModal } from "../../components/DemonstrationReceiptModal";
import { VoltOpsLoadingMark } from "../../components/VoltOpsLoadingMark";
import {
  ShieldCheckIcon,
  CheckIcon,
  CheckCircleIcon,
  CreditCardIcon,
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  ZapIcon,
  PhoneIcon,
  MailIcon,
} from "../../components/Icons";

export function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Selected plan determination: URL query param -> sessionStorage -> default Plan C
  const rawPlan = searchParams.get("plan") || searchParams.get("package") || sessionStorage.getItem("voltops_pending_plan") || "247-priority";
  const [selectedPlanId, setSelectedPlanId] = useState<CoveragePlanId>(
    (rawPlan.toLowerCase() in COVERAGE_PLANS ? rawPlan.toLowerCase() : "247-priority") as CoveragePlanId
  );

  useEffect(() => {
    sessionStorage.setItem("voltops_pending_plan", selectedPlanId);
  }, [selectedPlanId]);

  const planPricing = getCoveragePlanPricing(selectedPlanId);

  // Billing period state
  const [billingPeriod, setBillingPeriod] = useState<"Monthly" | "Annual">("Monthly");

  // Facility and contact info (pre-populated or editable)
  const [facilityName, setFacilityName] = useState(user?.company || "Apex Spinning & Weaving Mills, Savar");
  const [contactName, setContactName] = useState(user?.name || "Apex Facility Manager");
  const [contactEmail, setContactEmail] = useState(user?.email || "facility@apexmills.com");
  const [facilityAddress, setFacilityAddress] = useState("Plot 14-18, Sector 3, Savar DEPZ, Dhaka");
  const [contactPhone, setContactPhone] = useState("+880 1711-234567");

  // Payment processing lifecycle state
  const [checkoutStep, setCheckoutStep] = useState<"form" | "processing" | "success">("form");
  const [completedPurchase, setCompletedPurchase] = useState<CustomerPurchase | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Arithmetic calculations in BDT
  const baseMonthlyPrice = planPricing.monthlyBdtPrice || 4000;
  const multiplier = billingPeriod === "Annual" ? 12 * 0.9 : 1; // 10% discount for annual
  const baseAmount = Math.round(baseMonthlyPrice * multiplier);
  const vatAmount = Math.round(baseAmount * 0.05); // 5% illustrative prototype VAT
  const totalAmount = baseAmount + vatAmount;

  function handleCompleteDemoPayment() {
    if (checkoutStep !== "form" || completedPurchase) return; // Prevent double submit
    setCheckoutStep("processing");

    const suffix = Date.now().toString().slice(-6);
    const purchaseId = `PUR-${suffix}`;
    const receiptId = `REC-DEMO-${suffix}`;

    const newPurchase: CustomerPurchase = {
      purchaseId,
      receiptId,
      date: new Date().toISOString(),
      customerId: user?.id || "cust-epz-01",
      customerName: contactName.trim() || user?.name || "Apex Facility Manager",
      company: facilityName.trim() || user?.company || "Apex Spinning & Weaving Mills",
      facilityAddress: facilityAddress.trim() || "Plot 14-18, Sector 3, Savar DEPZ, Dhaka",
      planId: planPricing.id,
      planName: planPricing.name,
      includedVisits: planPricing.includedVisits || 15,
      arrivalSla: planPricing.arrivalSlaLabel,
      billingPeriod,
      amount: baseAmount,
      vatAmount,
      totalAmount,
      currency: "BDT",
      paymentMethod: "DEMO_PAYMENT",
      paymentStatus: "DEMO_PAID",
    };

    // Realistic demonstration delay to simulate transaction verification & escrow allocation
    setTimeout(() => {
      // Save purchase into operational store
      operationalStore.addPurchase(newPurchase);

      // Clear pending purchase key
      sessionStorage.removeItem("voltops_pending_plan");

      setCompletedPurchase(newPurchase);
      setCheckoutStep("success");
    }, 1100);
  }

  return (
    <div
      className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950 font-sans"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xl font-bold tracking-tight text-[var(--text-primary)] hover:text-emerald-500 transition-colors"
            >
              VoltOps
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">Subscription Checkout</span>
          </div>

          <Link
            to="/customer"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <span>Customer Portal</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>

        {/* Page Title & Status */}
        <div className="border-b border-[var(--border)] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[var(--text-primary)]">
                Confirm Coverage Plan
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                Establish commercial maintenance coverage and physical arrival SLA for your facility.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Plan Selection Verified</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Plan & Details (Left) + Order Summary & Payment (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Plan Selector & Facility Information */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Plan Switcher Tabs */}
            <div
              className="rounded-3xl border border-[var(--border)] p-6 shadow-sm space-y-4"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  1. Coverage Plan
                </h2>
                <span className="text-xs text-[var(--text-muted)]">Select or modify</span>
              </div>

              {/* 3 Standard Plan Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["8hr", "247-standard", "247-priority"] as CoveragePlanId[]).map((pid) => {
                  const p = COVERAGE_PLANS[pid];
                  const isSelected = selectedPlanId === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setSelectedPlanId(pid)}
                      className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                          : "border-[var(--border)] hover:border-emerald-500/50 bg-[var(--bg-surface-2)]"
                      }`}
                    >
                      {p.isPopular && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase">
                          Popular
                        </span>
                      )}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">
                          {p.code}
                        </span>
                        <h3 className="font-bold text-xs text-[var(--text-primary)] mt-0.5">
                          {p.name.split(" Coverage")[0]}
                        </h3>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                          {p.includedVisitsLabel}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[var(--border)]">
                        <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                          {p.formattedPrice}
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
                          {p.arrivalSlaLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Plan Details & Included Trade Capabilities */}
              <div className="pt-4 border-t border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ZapIcon size={14} className="text-emerald-500" />
                    <span>Arrival Commitment:</span>
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {planPricing.arrivalSlaLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ClockIcon size={14} className="text-emerald-500" />
                    <span>Coverage Schedule:</span>
                  </span>
                  <span className="text-[var(--text-secondary)] font-medium">
                    {planPricing.coverageWindow}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Billing Period Selector */}
            <div
              className="rounded-3xl border border-[var(--border)] p-6 shadow-sm space-y-3"
              style={{ background: "var(--bg-surface)" }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                2. Billing Schedule
              </h2>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("Monthly")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    billingPeriod === "Monthly"
                      ? "border-emerald-500 bg-emerald-500/10 font-bold"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] font-medium"
                  }`}
                >
                  <div className="text-[var(--text-primary)]">Monthly Billing</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Cancel or modify anytime</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingPeriod("Annual")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    billingPeriod === "Annual"
                      ? "border-emerald-500 bg-emerald-500/10 font-bold"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] font-medium"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-primary)]">Annual Commitment</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-bold">10% OFF</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">12 months continuous coverage</div>
                </button>
              </div>
            </div>

            {/* 3. Facility & Contact Details */}
            <div
              className="rounded-3xl border border-[var(--border)] p-6 shadow-sm space-y-4"
              style={{ background: "var(--bg-surface)" }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                3. Facility Deployment Location
              </h2>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Facility Name / Company
                    </label>
                    <div className="relative">
                      <BuildingIcon size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border rounded-xl"
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Facility Manager Name
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl"
                      style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Contact Email
                    </label>
                    <div className="relative">
                      <MailIcon size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border rounded-xl"
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Direct Dispatch Hotline Phone
                    </label>
                    <div className="relative">
                      <PhoneIcon size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border rounded-xl"
                        style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                    Facility Physical Address
                  </label>
                  <input
                    type="text"
                    value={facilityAddress}
                    onChange={(e) => setFacilityAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                    style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Order Summary & Payment Gateway Boundaries */}
          <div className="lg:col-span-5 space-y-6">
            {/* Order Summary Card */}
            <div
              className="rounded-3xl border border-[var(--border)] p-6 shadow-sm space-y-4"
              style={{ background: "var(--bg-surface)" }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Order Summary
              </h2>

              <div className="border-b border-[var(--border)] pb-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">{planPricing.name}</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {formatBdt(baseAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>Schedule: {billingPeriod}</span>
                  <span>{planPricing.includedVisitsLabel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span>Guaranteed SLA:</span>
                  <span className="font-bold">{planPricing.arrivalSlaLabel}</span>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatBdt(baseAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VAT / Regulatory Fee (5%)</span>
                  <span className="font-mono">{formatBdt(vatAmount)}</span>
                </div>
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between font-bold text-sm text-[var(--text-primary)]">
                  <span>Total Amount</span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                    {formatBdt(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Prototype Pricing Disclaimer */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheckIcon size={14} className="text-amber-600" />
                  <span>Prototype Demonstration Rates</span>
                </div>
                <p className="text-[10px] leading-relaxed text-amber-900/80 dark:text-amber-300/80">
                  Prices displayed above are illustrative prototype rates for Sunday demonstration and evaluation. They are not approved commercial rates.
                </p>
              </div>
            </div>

            {/* Payment Method Selector & Gateway Integration Boundary */}
            <div
              className="rounded-3xl border border-[var(--border)] p-6 shadow-sm space-y-4"
              style={{ background: "var(--bg-surface)" }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Payment Method
              </h2>

              {checkoutStep === "processing" ? (
                <div className="p-8 rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/[0.04] text-center space-y-4 shadow-lg backdrop-blur-sm animate-in fade-in duration-150">
                  <VoltOpsLoadingMark size="lg" message="Processing demonstration payment..." />
                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Establishing Demonstration Facility Escrow
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                      Allocating {planPricing.name} quota ({planPricing.includedVisits || 15} visits, {planPricing.arrivalSlaLabel}) in local demonstration memory...
                    </p>
                  </div>
                </div>
              ) : checkoutStep === "success" && completedPurchase ? (
                <div className="p-6 sm:p-7 rounded-3xl border-2 border-emerald-500 bg-emerald-500/10 text-center space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 mx-auto shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                    <CheckCircleIcon size={34} />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      DEMO_PAID • PROTOTYPE
                    </span>
                    <h3 className="text-xl font-heading font-extrabold text-[var(--text-primary)] pt-1">
                      Demo Payment Successful
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Subscription active for {completedPurchase.company}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Total Amount Paid</span>
                      <span className="font-extrabold text-sm text-[var(--text-primary)]">{formatBdt(completedPurchase.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Subscribed Plan</span>
                      <span className="font-semibold text-[var(--text-primary)]">{completedPurchase.planName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Guaranteed Arrival</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedPurchase.arrivalSla}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Maintenance Allowance</span>
                      <span className="font-semibold text-[var(--text-primary)]">{completedPurchase.includedVisits} included visits</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[10px] font-mono text-[var(--text-muted)]">
                      <span>Receipt Reference</span>
                      <span>{completedPurchase.receiptId}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] italic">
                    Simulated payment in Local Preview Mode. No real financial charge was made.
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(true)}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
                    >
                      <CreditCardIcon size={16} />
                      <span>View Demonstration Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/customer")}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border)] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Open Customer Portal</span>
                      <ArrowRightIcon size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. Real Payment Gateway (Stripe & SSLCommerz Boundary) */}
                  <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] opacity-60 space-y-2 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                        <CreditCardIcon size={16} />
                        <span>Stripe & SSLCommerz Gateways</span>
                      </span>
                      <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-500/20 text-[var(--text-muted)]">
                        Requires Backend
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      Real payment card tokenization and mobile banking (bKash/Nagad) require the live VoltOps backend payment microservice.
                    </p>
                  </div>

                  {/* 2. Demonstration Checkout (Local Preview Mode) */}
                  <div className="p-4 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Demo Checkout</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        DEMO_PAID
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Demonstrate the full checkout lifecycle and instant receipt issuance without a real financial charge.
                    </p>

                    <button
                      type="button"
                      onClick={handleCompleteDemoPayment}
                      disabled={checkoutStep !== "form"}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
                    >
                      <CheckIcon size={16} />
                      <span>Complete Demo Payment ({formatBdt(totalAmount)})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demonstration Receipt Modal upon demand or trigger */}
      {showReceiptModal && completedPurchase && (
        <DemonstrationReceiptModal
          purchase={completedPurchase}
          onClose={() => setShowReceiptModal(false)}
          onContinueToPortal={() => navigate("/customer")}
        />
      )}
    </div>
  );
}
export default Checkout;
