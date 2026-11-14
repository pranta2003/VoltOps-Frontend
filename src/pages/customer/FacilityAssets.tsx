import { useState, useEffect, useMemo, FormEvent, Fragment } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import {
  CustomerAsset,
  CANONICAL_SERVICE_CATEGORIES,
  ServiceCategory,
  PriorityLevel,
  TechnicianProfile,
} from "../../types";
import { customerService } from "../../services/customerService";
import { operationalStore } from "../../services/operationalStore";
import {
  WrenchIcon,
  SearchIcon,
  XIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  BuildingIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "../../components/Icons";

export function FacilityAssets() {
  const { user } = useAuth();

  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CustomerAsset | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Step 3: Asset-Specific Report Breakdown Modal State
  const [reportingAsset, setReportingAsset] = useState<CustomerAsset | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportPriority, setReportPriority] = useState<PriorityLevel>("URGENT");
  const [reportPreferredTechId, setReportPreferredTechId] = useState("");
  const [reportAsQuotation, setReportAsQuotation] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessId, setReportSuccessId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Available technicians for customer preference
  const technicians = useMemo<TechnicianProfile[]>(() => {
    return operationalStore.getTechnicians();
  }, []);

  function loadAssets() {
    setIsLoading(true);
    setError(null);

    customerService
      .getAssets(user?.id)
      .then((res) => {
        setAssets(res.data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load facility assets.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    loadAssets();
    const unsubscribe = operationalStore.subscribe(() => {
      loadAssets();
    });
    return unsubscribe;
  }, [user?.id]);

  // Derive linked open requests per asset
  const activeRequests = useMemo(() => {
    const workOrders = operationalStore.getWorkOrders();
    return operationalStore.getRequests().filter((r) => {
      if (r.status === "CANCELLED") return false;
      if (r.status === "CONVERTED") {
        const wo = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);
        return wo ? wo.status !== "COMPLETED" && wo.status !== "CANCELLED" : false;
      }
      return true;
    });
  }, [assets]);

  const getLinkedRequest = (assetName: string) => {
    return activeRequests.find((r) => r.assetName === assetName);
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          asset.name.toLowerCase().includes(q) ||
          asset.tagNumber.toLowerCase().includes(q) ||
          asset.location.toLowerCase().includes(q) ||
          asset.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (categoryFilter !== "ALL" && asset.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && asset.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [assets, searchQuery, categoryFilter, statusFilter]);

  // KPI Calculations
  const totalCount = assets.length;
  const operationalCount = assets.filter((a) => a.status === "OPERATIONAL").length;
  const attentionCount = assets.filter((a) => a.status === "NEEDS_SERVICE" || a.status === "OUT_OF_ORDER").length;

  const getStatusBadge = (status: CustomerAsset["status"]) => {
    switch (status) {
      case "OPERATIONAL":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "NEEDS_SERVICE":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "OUT_OF_ORDER":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-bold";
      default:
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
  };

  const hasActiveFilters = searchQuery !== "" || categoryFilter !== "ALL" || statusFilter !== "ALL";

  // Check subscription entitlement
  const subscription = customerService.getSubscription(user?.id);

  // Relevant technicians matching the reporting asset's category
  const relevantTechnicians = useMemo(() => {
    if (!reportingAsset) return [];
    const cat = reportingAsset.category.toLowerCase();
    const matched = technicians.filter(
      (t) =>
        t.skills?.some((s) => s.category === reportingAsset.category) ||
        t.designation?.toLowerCase().includes(cat.split(",")[0].trim()) ||
        t.designation?.toLowerCase().includes(cat.split(" ")[0].trim())
    );
    return matched.length > 0 ? matched : technicians.filter((t) => t.status === "AVAILABLE" || t.status === "ON_JOB");
  }, [reportingAsset, technicians]);

  // Open asset report breakdown modal
  const openReportModal = (asset: CustomerAsset) => {
    setReportingAsset(asset);
    setReportTitle(`Breakdown on ${asset.name}`);
    setReportDescription("");
    setReportPriority("URGENT");
    setReportPreferredTechId("");
    setReportAsQuotation(false);
    setReportSuccessId(null);
    setReportError(null);
  };

  const closeReportModal = () => {
    setReportingAsset(null);
    setReportTitle("");
    setReportDescription("");
    setReportSuccessId(null);
    setReportError(null);
    setIsSubmittingReport(false);
  };

  // Handle asset-specific breakdown submission
  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportingAsset || isSubmittingReport) return;

    if (!reportTitle.trim()) {
      setReportError("Please specify what's wrong.");
      return;
    }

    if (subscription.isExhausted && !reportAsQuotation) {
      setReportError(
        `Monthly service allowance exhausted (${subscription.includedVisits} of ${subscription.includedVisits} used). Enable 'Submit as Additional Quotation' to proceed.`
      );
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    const preferredTech = technicians.find((t) => t.id === reportPreferredTechId);

    try {
      const res = await customerService.createRequest(
        {
          category: reportingAsset.category,
          assetName: reportingAsset.name,
          problemTitle: reportTitle.trim(),
          problemDescription: reportDescription.trim() || reportTitle.trim(),
          priority: reportPriority,
          preferredTechnicianId: reportPreferredTechId || undefined,
          preferredTechnicianName: preferredTech ? `${preferredTech.name} (${preferredTech.designation})` : undefined,
          isAdditionalPaidQuotation: reportAsQuotation,
          coveragePlan: subscription.planId || "247-priority",
        },
        {
          id: user?.id,
          name: user?.name,
          address: user?.company || "Apex Spinning & Weaving Mills, Savar",
          coveragePlan: subscription.planId || "247-priority",
        }
      );

      // Update asset status to NEEDS_SERVICE if previously OPERATIONAL
      if (reportingAsset.status === "OPERATIONAL") {
        const allAssets = operationalStore.getAssets();
        const updated = allAssets.map((a) =>
          a.id === reportingAsset.id ? { ...a, status: "NEEDS_SERVICE" as const } : a
        );
        operationalStore.setAssets(updated);
        setAssets(updated);
      }

      setReportSuccessId(res.data.id);
      setIsSubmittingReport(false);
    } catch (err: any) {
      setIsSubmittingReport(false);
      setReportError(err.message || "Failed to submit breakdown request.");
    }
  };

  return (
    <Layout
      title="Facility Assets"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAssets}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
            title="Refresh assets"
          >
            <RefreshCwIcon size={13} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/customer/new-request"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
          >
            <WrenchIcon size={14} />
            <span>Report Breakdown</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Subscription Service Allowance Summary ────────────────────── */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-heading text-[var(--text-primary)]">
                Subscription Visit Allowance
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {subscription.planName}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
              <span>Billing Cycle: Resets {subscription.billingCycleResetDate}</span>
              {subscription.hasActiveSubscription && (
                <Link
                  to={`/checkout?plan=${subscription.planId || "247-priority"}`}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Manage Plan &rarr;
                </Link>
              )}
            </div>
          </div>

          {/* 3 Balanced Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Monthly Included Visits */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
              <span className="text-xs font-medium text-[var(--text-muted)] block">
                Monthly Included Visits
              </span>
              <div className="mt-1.5 text-2xl font-bold font-heading text-[var(--text-primary)]">
                {subscription.needsConfiguration ? (
                  <span className="text-sm font-semibold text-[var(--text-muted)]">Negotiated</span>
                ) : subscription.includedVisits !== null ? (
                  subscription.includedVisits
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-muted)]">Unavailable</span>
                )}
              </div>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                {subscription.planId === "8hr" ? "Plan A (Daily)" : subscription.planId === "247-standard" ? "Plan B (Standard)" : subscription.planId === "247-priority" ? "Plan C (Priority)" : "Plan D (Custom)"} allocation
              </span>
            </div>

            {/* Card 2: Visits Used */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
              <span className="text-xs font-medium text-[var(--text-muted)] block">
                Visits Used
              </span>
              <div className="mt-1.5 text-2xl font-bold font-heading text-[var(--text-primary)]">
                {subscription.usedVisits}
              </div>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                Approved non-cancelled dispatches
              </span>
            </div>

            {/* Card 3: Visits Remaining (Emerald) */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block">
                Visits Remaining
              </span>
              <div className="mt-1.5 text-2xl font-bold font-heading text-[#10b981]">
                {subscription.needsConfiguration ? (
                  <span className="text-sm font-semibold text-slate-500">To be confirmed</span>
                ) : subscription.remainingVisits !== null ? (
                  subscription.remainingVisits
                ) : (
                  <span className="text-sm font-semibold text-slate-500">—</span>
                )}
              </div>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 block font-medium">
                {subscription.isExhausted ? "Allowance exhausted this cycle" : "Available for emergency dispatch"}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {!subscription.needsConfiguration && subscription.includedVisits !== null && (
            <div className="space-y-1 pt-1">
              <div className="h-2 w-full bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    subscription.isExhausted ? "bg-amber-500" : "bg-[#10b981]"
                  }`}
                  style={{
                    width: `${Math.min(100, (subscription.usedVisits / (subscription.includedVisits || 1)) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>{subscription.usedVisits} of {subscription.includedVisits} visits utilized ({Math.round((subscription.usedVisits / subscription.includedVisits) * 100)}%)</span>
                <span>{subscription.remainingVisits} remaining</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Summary KPI Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Total Assets</span>
              <BuildingIcon size={16} className="text-[#10b981]" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
              {isLoading ? "—" : totalCount}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">Registered equipment items</div>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <span>Operational</span>
              <CheckCircleIcon size={16} className="text-emerald-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-emerald-700 dark:text-emerald-400">
              {isLoading ? "—" : operationalCount}
            </div>
            <div className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium">
              Normal operating parameters
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <span>Service Required</span>
              <AlertTriangleIcon size={16} className="text-amber-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-amber-700 dark:text-amber-400">
              {isLoading ? "—" : attentionCount}
            </div>
            <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80 font-medium">
              Needs inspection or repair
            </div>
          </div>
        </div>

        {/* ── Toolbar: Search & Filters ───────────────────────────────────── */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Box */}
            <div className="relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="assets-search"
                name="search"
                type="text"
                placeholder="Search asset, tag, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            {/* Trade Category Filter */}
            <div>
              <select
                id="assets-category-filter"
                name="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                aria-label="Filter by trade category"
              >
                <option value="ALL">All Equipment Categories</option>
                {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                id="assets-status-filter"
                name="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                aria-label="Filter by operational status"
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="NEEDS_SERVICE">Needs Service</option>
                <option value="OUT_OF_ORDER">Out of Order</option>
              </select>
            </div>
          </div>

          {/* Counts & Clear Action */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 flex-wrap gap-2">
            <div>
              Displaying <span className="font-bold text-[var(--text-primary)]">{filteredAssets.length}</span> of{" "}
              <span className="font-bold text-[var(--text-primary)]">{assets.length}</span> assets
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[#10b981] hover:underline flex items-center gap-1"
              >
                <span>Reset filters</span>
                <XIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadAssets}
              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Asset Inventory Table (Clean, Proportional, Scannable) ──────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Asset & Tag</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Category</th>
                  <th className="py-3 px-4">Facility Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden md:table-cell">Last Service</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Active Incident</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
                      <div className="inline-block animate-spin mb-2">
                        <RefreshCwIcon size={20} className="text-[#10b981]" />
                      </div>
                      <p>Loading facility assets...</p>
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-xs text-[var(--text-muted)] space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] mx-auto flex items-center justify-center text-[var(--text-muted)]">
                        <WrenchIcon size={24} />
                      </div>
                      {hasActiveFilters ? (
                        <>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">No assets match your filter</p>
                          <p>Try clearing your search query or choosing another trade category.</p>
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">No equipment assets registered</p>
                          <p>Register facility equipment assets to enable one-click incident reporting.</p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const linkedReq = getLinkedRequest(asset.name);
                    const isExpanded = expandedAssetId === asset.id;

                    return (
                      <Fragment key={asset.id}>
                        <tr
                          className={`hover:bg-[var(--bg-surface-2)] transition-colors ${
                            isExpanded ? "bg-[var(--bg-surface-2)]/50" : ""
                          }`}
                        >
                          <td className="py-3 px-4 min-w-[190px]">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
                                title={isExpanded ? "Collapse details" : "Expand full location and specifications"}
                                aria-expanded={isExpanded}
                              >
                                <ChevronDownIcon
                                  size={13}
                                  className={`transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              <div>
                                <div className="font-semibold text-[var(--text-primary)] leading-snug">
                                  {asset.name}
                                </div>
                                <div className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5">
                                  Tag: {asset.tagNumber}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[var(--text-muted)] hidden sm:table-cell whitespace-nowrap">
                            {asset.category}
                          </td>

                          <td className="py-3 px-4 min-w-[180px]">
                            <span className="text-[var(--text-primary)] font-medium block leading-snug">
                              {asset.location}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border font-semibold ${getStatusBadge(
                                asset.status
                              )}`}
                            >
                              {asset.status.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs hidden md:table-cell whitespace-nowrap">
                            {asset.lastServiceDate ? (
                              <span className="text-[var(--text-primary)] font-medium block">
                                {asset.lastServiceDate}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs hidden lg:table-cell whitespace-nowrap">
                            {linkedReq ? (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                <AlertTriangleIcon size={12} className="shrink-0" />
                                <span>{linkedReq.id} ({linkedReq.priority})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-normal">None active</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedAsset(asset)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all flex items-center gap-1"
                                title="View technical passport specifications"
                              >
                                <EyeIcon size={12} />
                                <span className="hidden sm:inline">Specs</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openReportModal(asset)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 transition-all flex items-center gap-1"
                                title={`Report breakdown for ${asset.name}`}
                              >
                                <WrenchIcon size={12} />
                                <span>Report</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Detail View for Long Addresses & Specifications */}
                        {isExpanded && (
                          <tr className="bg-[var(--bg-surface-2)]/50 border-b border-[var(--border)]">
                            <td colSpan={7} className="px-6 py-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                                    Full Facility Placement & Address
                                  </span>
                                  <span className="font-semibold text-[var(--text-primary)] block mt-0.5">
                                    {asset.location}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                                    Apex Spinning & Weaving Mills · Savar Industrial EPZ Hub
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                                    Equipment Identification
                                  </span>
                                  <span className="font-semibold text-[var(--text-primary)] block mt-0.5">
                                    {asset.name}
                                  </span>
                                  <span className="text-[11px] font-mono text-[var(--text-muted)] block mt-0.5">
                                    Category: {asset.category} · Tag: {asset.tagNumber}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                                    Maintenance & Service Cycle
                                  </span>
                                  <span className="font-medium text-[var(--text-primary)] block mt-0.5">
                                    Installed: {asset.installedDate || "2021-03-15"}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                                    Last Service: {asset.lastServiceDate || "None recorded"} · Quarterly Preventive Inspection
                                  </span>
                                </div>
                              </div>

                              {linkedReq && (
                                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangleIcon size={14} className="text-amber-500 shrink-0" />
                                    <span className="font-semibold text-[var(--text-primary)]">
                                      Active Service Incident: {linkedReq.id} — {linkedReq.problemTitle}
                                    </span>
                                  </div>
                                  <Link to="/customer" className="font-bold text-[#10b981] hover:underline">
                                    View on Dashboard →
                                  </Link>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Asset Specifications Modal (Secondary Details) ──────────────── */}
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Asset Specifications
                  </span>
                  <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                    {selectedAsset.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Asset Tag</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{selectedAsset.tagNumber}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Trade Category</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.category}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Facility Location</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.location}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Status</span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border font-bold ${getStatusBadge(
                        selectedAsset.status
                      )}`}
                    >
                      {selectedAsset.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Installed Date</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.installedDate || "Not recorded"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Last Service</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.lastServiceDate || "None"}</span>
                  </div>
                </div>

                {getLinkedRequest(selectedAsset.name) ? (
                  <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                    <div className="font-bold text-amber-700 dark:text-amber-300">Active Incident:</div>
                    <div className="text-[11px] text-[var(--text-primary)]">
                      {getLinkedRequest(selectedAsset.name)?.id} — {getLinkedRequest(selectedAsset.name)?.problemTitle}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-xs">
                    No active breakdown tickets open for this asset.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    const toReport = selectedAsset;
                    setSelectedAsset(null);
                    openReportModal(toReport);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all flex items-center gap-1.5"
                >
                  <WrenchIcon size={13} />
                  <span>Report Breakdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Compact, Professional Breakdown Report Modal ────────────────── */}
        {reportingAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-xl space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                  Report a Breakdown
                </h3>
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Close modal"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {reportSuccessId ? (
                /* Success Confirmation State */
                <div className="py-4 text-center space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-xl bg-[#10b981] text-[#06090e] font-extrabold text-xl mx-auto flex items-center justify-center shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-base text-[var(--text-primary)]">
                      Breakdown Reported
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Request submitted and awaiting dispatcher review.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 inline-block font-mono font-bold text-xs text-[#10b981]">
                    Tracking ID: {reportSuccessId}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    Local preview: Asset marked as Needs Service. Final technician assignment is confirmed by the dispatcher.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Report Breakdown Form */
                <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
                  {reportError && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 flex items-center justify-between">
                      <span>{reportError}</span>
                      <button
                        type="button"
                        onClick={() => setReportError(null)}
                        className="font-bold underline ml-2"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Compact Selected Asset Identification Row */}
                  <div className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{reportingAsset.name}</span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="font-mono text-[var(--text-muted)]">{reportingAsset.tagNumber}</span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-[var(--text-muted)]">{reportingAsset.location}</span>
                  </div>

                  {/* 1. What's wrong? */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                      What's wrong? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Unusual noise, power trip, or sensor alarm"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-xs focus:ring-1 focus:ring-[#10b981] outline-none"
                    />
                  </div>

                  {/* 2. Additional details (optional) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[var(--text-primary)]">
                        Additional details
                      </label>
                      <span className="text-[10px] text-[var(--text-muted)]">Optional</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Describe symptoms, visible alarms, or operational impact..."
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-xs focus:ring-1 focus:ring-[#10b981] outline-none"
                    />
                  </div>

                  {/* 3. Priority */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                      Priority
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["URGENT", "HIGH", "MEDIUM", "LOW"] as PriorityLevel[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setReportPriority(p)}
                          className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] transition-all ${
                            reportPriority === p
                              ? p === "URGENT"
                                ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 ring-1 ring-red-500"
                                : "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40 ring-1 ring-[#10b981]"
                              : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Preferred technician (optional, only if relevant technicians are available) */}
                  {relevantTechnicians.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-[var(--text-primary)]">
                          Preferred technician
                        </label>
                        <span className="text-[10px] text-[var(--text-muted)]">Optional</span>
                      </div>
                      <select
                        value={reportPreferredTechId}
                        onChange={(e) => setReportPreferredTechId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-xs focus:ring-1 focus:ring-[#10b981] outline-none"
                      >
                        <option value="">No preference</option>
                        {relevantTechnicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {t.designation} ({t.branch})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Short Note */}
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Technician assignment is confirmed by the dispatcher.
                  </p>

                  {/* Modal Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      disabled={isSubmittingReport}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport || (subscription.isExhausted && !reportAsQuotation)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>
                        {isSubmittingReport
                          ? "Submitting..."
                          : subscription.isExhausted && !reportAsQuotation
                          ? "Allowance Exhausted"
                          : "Submit Report"}
                      </span>
                      <ArrowRightIcon size={12} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
