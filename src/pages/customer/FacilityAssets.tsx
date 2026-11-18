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
  EyeIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  LockIcon,
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

  // Breakdown Report Modal State
  const [reportingAsset, setReportingAsset] = useState<CustomerAsset | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportPriority, setReportPriority] = useState<PriorityLevel>("URGENT");
  const [reportPreferredTechId, setReportPreferredTechId] = useState("");
  const [reportAsQuotation, setReportAsQuotation] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessId, setReportSuccessId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Available technicians
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

  // Derive linked open requests per asset for this customer
  const activeRequests = useMemo(() => {
    const workOrders = operationalStore.getWorkOrders();
    return operationalStore.getRequests().filter((r) => {
      if (user?.id && r.customerId !== user.id) return false;
      if (r.status === "CANCELLED" || r.status === "RESOLVED") return false;
      if (r.status === "CONVERTED" || r.workOrderId) {
        const wo = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);
        return wo ? wo.status !== "COMPLETED" && wo.status !== "CANCELLED" : false;
      }
      return true;
    });
  }, [assets, user?.id]);

  const hasActiveRequest = activeRequests.length > 0;

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

      if (statusFilter !== "ALL") {
        if (statusFilter === "NEEDS_SERVICE") {
          if (asset.status !== "NEEDS_SERVICE" && asset.status !== "OUT_OF_ORDER") return false;
        } else if (asset.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [assets, searchQuery, categoryFilter, statusFilter]);

  // Counts
  const totalCount = assets.length;
  const operationalCount = assets.filter((a) => a.status === "OPERATIONAL").length;
  const attentionCount = assets.filter((a) => a.status === "NEEDS_SERVICE" || a.status === "OUT_OF_ORDER").length;

  const getStatusBadge = (status: CustomerAsset["status"]) => {
    switch (status) {
      case "OPERATIONAL":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-[#10b981] dark:border-emerald-500/20";
      case "NEEDS_SERVICE":
      case "OUT_OF_ORDER":
        return "bg-[#b8287a]/10 text-[#8a1858] border-[#b8287a]/25 dark:bg-[#b8287a]/15 dark:text-[#f472b6] dark:border-[#b8287a]/30 font-semibold";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/5";
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
  };

  const hasActiveFilters = searchQuery !== "" || categoryFilter !== "ALL" || statusFilter !== "ALL";
  const subscription = customerService.getSubscription(user?.id);

  // Relevant technicians
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

  const openReportModal = (asset: CustomerAsset) => {
    if (hasActiveRequest) return;
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

  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportingAsset || isSubmittingReport) return;

    if (hasActiveRequest) {
      setReportError("An active service request is already in progress.");
      return;
    }

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
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-xs"
            title="Refresh assets"
          >
            <RefreshCwIcon size={12} className={isLoading ? "animate-spin text-[#10b981]" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {hasActiveRequest ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-white/5 cursor-not-allowed">
              <LockIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Active request open</span>
            </div>
          ) : (
            <Link
              to="/customer/new-request"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#10b981] dark:text-zinc-950 dark:hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
            >
              <WrenchIcon size={13} />
              <span>Report Breakdown</span>
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-4 max-w-6xl mx-auto pb-24">
        {/* Compact Summary & Filter Pills Toolbar */}
        <div className="p-4 rounded-xl border border-slate-300 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.10)] space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Inline Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === "ALL"
                    ? "bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-zinc-100 border border-slate-300 dark:border-white/10 shadow-xs font-semibold"
                    : "bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-400 border border-slate-200 dark:border-white/5 hover:text-slate-950 dark:hover:text-zinc-200 hover:border-slate-300 dark:hover:border-white/10"
                }`}
              >
                <span>All Assets</span>
                <span className="font-mono tabular-nums text-[11px] font-semibold opacity-85">({totalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("OPERATIONAL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === "OPERATIONAL"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-[#10b981]/15 dark:text-[#10b981] dark:border-[#10b981]/30 shadow-xs font-semibold"
                    : "bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-400 border border-slate-200 dark:border-white/5 hover:text-emerald-800 dark:hover:text-[#10b981] hover:border-emerald-300 dark:hover:border-[#10b981]/20"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span>Operational</span>
                <span className="font-mono tabular-nums text-[11px] font-semibold opacity-85">({operationalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("NEEDS_SERVICE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === "NEEDS_SERVICE"
                    ? "bg-[#b8287a]/10 text-[#8a1858] border border-[#b8287a]/30 dark:bg-[#b8287a]/20 dark:text-[#f472b6] dark:border-[#b8287a]/40 shadow-xs font-semibold"
                    : "bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-400 border border-slate-200 dark:border-white/5 hover:text-[#8a1858] dark:hover:text-[#f472b6] hover:border-[#b8287a]/30"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a]" />
                <span>Needs Service</span>
                <span className="font-mono tabular-nums text-[11px] font-semibold opacity-85">({attentionCount})</span>
              </button>
            </div>

            {/* Total Indicator */}
            <div className="text-xs text-slate-700 dark:text-zinc-400 font-medium">
              Showing <span className="font-bold text-slate-950 dark:text-zinc-200 tabular-nums">{filteredAssets.length}</span> of{" "}
              <span className="font-bold text-slate-950 dark:text-zinc-200 tabular-nums">{assets.length}</span>
            </div>
          </div>

          {/* Search Box & Category Select */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            <div className="sm:col-span-8 relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="assets-search"
                name="search"
                type="text"
                placeholder="Search asset name, serial tag, or facility location…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-100 dark:placeholder:text-zinc-500 shadow-xs focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            <div className="sm:col-span-4">
              <select
                id="assets-category-filter"
                name="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-200 shadow-xs focus:outline-none transition-colors font-medium"
                aria-label="Filter by trade category"
              >
                <option value="ALL">All Categories</option>
                {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadAssets}
              className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Asset Inventory Table (Proportional, Desktop Fit, Zero Horizontal Scroll) */}
        <div className="rounded-xl border border-slate-300 dark:border-white/5 bg-white dark:bg-zinc-900 overflow-hidden shadow-[0_2px_10px_-3px_rgba(15,23,42,0.10)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300/80 dark:border-white/5 bg-slate-100 dark:bg-zinc-950/60 text-slate-700 dark:text-zinc-400 font-semibold text-[11px]">
                <th className="py-3 px-3.5">Asset & Tag</th>
                <th className="py-3 px-3 hidden sm:table-cell">Category</th>
                <th className="py-3 px-3 hidden md:table-cell">Location</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 hidden lg:table-cell">Last Service</th>
                <th className="py-3 px-3">Active Incident</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-zinc-500 space-y-2">
                    <div className="inline-block animate-spin mb-2">
                      <RefreshCwIcon size={18} className="text-[#10b981]" />
                    </div>
                    <p>Loading facility assets…</p>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-zinc-500 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 mx-auto flex items-center justify-center text-zinc-500">
                      <WrenchIcon size={20} />
                    </div>
                    <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-300">No assets match your search</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Reset filters
                      </button>
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
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                          isExpanded ? "bg-zinc-50/80 dark:bg-zinc-800/30" : ""
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
                              title={isExpanded ? "Collapse details" : "Expand specifications"}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDownIcon
                                size={12}
                                className={`transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            <div>
                              <div className="font-semibold text-zinc-950 dark:text-zinc-100 leading-snug">
                                {asset.name}
                              </div>
                              <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                                Tag: {asset.tagNumber}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-zinc-700 dark:text-zinc-400 hidden sm:table-cell font-medium">
                          {asset.category}
                        </td>

                        <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 hidden md:table-cell font-medium">
                          <span className="truncate block max-w-[200px]" title={asset.location}>
                            {asset.location}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border font-semibold ${getStatusBadge(
                              asset.status
                            )}`}
                          >
                            {asset.status.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-xs hidden lg:table-cell whitespace-nowrap text-zinc-700 dark:text-zinc-400">
                          {asset.lastServiceDate ? (
                            <span className="tabular-nums font-medium">{asset.lastServiceDate}</span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-600">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          {linkedReq ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#b8287a]/10 text-[#8a1858] border border-[#b8287a]/25 dark:bg-[#b8287a]/15 dark:text-[#f472b6] dark:border-[#b8287a]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a]" />
                              <span>{linkedReq.id}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium">None active</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAsset(asset)}
                              className="px-2 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-white/5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1"
                              title="View specs"
                            >
                              <EyeIcon size={12} />
                              <span className="hidden sm:inline">Specs</span>
                            </button>

                            {hasActiveRequest ? (
                              <button
                                type="button"
                                disabled
                                className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-white/5 cursor-not-allowed flex items-center gap-1"
                                title="Active request open"
                              >
                                <LockIcon size={11} />
                                <span>Report</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openReportModal(asset)}
                                className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:border-transparent dark:bg-[#10b981]/15 dark:text-[#10b981] dark:hover:bg-[#10b981]/25 transition-all flex items-center gap-1"
                                title={`Report breakdown for ${asset.name}`}
                              >
                                <WrenchIcon size={11} />
                                <span>Report</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Technical Passport Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-zinc-950/40 border-b border-slate-200 dark:border-white/5">
                          <td colSpan={7} className="px-5 py-3.5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-500 block">
                                  Full Placement Location
                                </span>
                                <span className="font-semibold text-zinc-950 dark:text-zinc-200 block mt-0.5">
                                  {asset.location}
                                </span>
                                <span className="text-[11px] text-zinc-700 dark:text-zinc-400 block mt-0.5 font-medium">
                                  Apex Spinning & Weaving Mills · Savar Commercial Complex
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-500 block">
                                  Equipment Identification
                                </span>
                                <span className="font-semibold text-zinc-950 dark:text-zinc-200 block mt-0.5">
                                  {asset.name}
                                </span>
                                <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-400 block mt-0.5">
                                  Category: {asset.category} · Tag: {asset.tagNumber}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-500 block">
                                  Maintenance Schedule
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-300 block mt-0.5">
                                  Installed: {asset.installedDate || "2021-03-15"}
                                </span>
                                <span className="text-[11px] text-zinc-700 dark:text-zinc-400 block mt-0.5">
                                  Last Service: {asset.lastServiceDate || "None recorded"}
                                </span>
                              </div>
                            </div>

                            {linkedReq && (
                              <div className="mt-2.5 p-2 rounded-lg border border-[#b8287a]/25 bg-[#b8287a]/10 dark:border-[#b8287a]/30 dark:bg-[#b8287a]/10 text-xs flex items-center justify-between">
                                <span className="font-medium text-[#8a1858] dark:text-[#f472b6]">
                                  Active Incident: {linkedReq.id} — {linkedReq.problemTitle}
                                </span>
                                <Link to="/customer" className="font-bold text-emerald-800 dark:text-[#10b981] hover:underline">
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

        {/* Asset Specifications Modal */}
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/5">
                <div>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Technical Specifications
                  </span>
                  <h3 className="font-heading font-bold text-lg text-zinc-900 dark:text-zinc-50">
                    {selectedAsset.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <XIcon size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500 block">Asset Tag</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{selectedAsset.tagNumber}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500 block">Category</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedAsset.category}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500 block">Placement</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedAsset.location}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500 block">Status</span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border font-bold ${getStatusBadge(
                        selectedAsset.status
                      )}`}
                    >
                      {selectedAsset.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500 block">Installed</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedAsset.installedDate || "Not recorded"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5">
                    <span className="text-[10px] font-semibold text-zinc-500 block">Last Service</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedAsset.lastServiceDate || "None"}</span>
                  </div>
                </div>

                {getLinkedRequest(selectedAsset.name) ? (
                  <div className="p-3 rounded-xl border border-[#b8287a]/25 bg-[#b8287a]/10 space-y-1">
                    <div className="font-bold text-[#9d1d66] dark:text-[#f472b6]">Active Incident:</div>
                    <div className="text-[11px] text-zinc-800 dark:text-zinc-200">
                      {getLinkedRequest(selectedAsset.name)?.id} — {getLinkedRequest(selectedAsset.name)?.problemTitle}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-800 dark:text-[#10b981] text-xs">
                    No active breakdown tickets open for this asset.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-white/5">
                {!hasActiveRequest ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toReport = selectedAsset;
                      setSelectedAsset(null);
                      openReportModal(toReport);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 hover:bg-[#34d399] transition-all flex items-center gap-1.5"
                  >
                    <WrenchIcon size={13} />
                    <span>Report Breakdown</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <LockIcon size={12} className="text-zinc-500" />
                    <span>Active request open</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Report Modal */}
        {reportingAsset && !hasActiveRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/5">
                <h3 className="font-heading font-bold text-lg text-zinc-900 dark:text-zinc-50">
                  Report a Breakdown
                </h3>
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  title="Close modal"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {reportSuccessId ? (
                <div className="py-4 text-center space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-xl bg-[#10b981] text-zinc-950 font-extrabold text-xl mx-auto flex items-center justify-center shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                      Breakdown Reported
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      Request submitted and awaiting dispatcher triage.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl border border-emerald-300 dark:border-[#10b981]/30 bg-emerald-50 dark:bg-[#10b981]/10 inline-block font-mono font-bold text-xs text-emerald-800 dark:text-[#10b981]">
                    Tracking ID: {reportSuccessId}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 hover:bg-[#34d399] transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
                  {reportError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 flex items-center justify-between">
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

                  <div className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-200">{reportingAsset.name}</span>
                    <span className="text-zinc-400 dark:text-zinc-600">•</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">{reportingAsset.tagNumber}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      What's wrong? <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Unusual noise, power trip, or sensor alarm…"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-1 focus:ring-[#10b981] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Additional details
                      </label>
                      <span className="text-[10px] text-zinc-500">Optional</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Describe symptoms, visible alarms, or operational impact…"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-1 focus:ring-[#10b981] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                                ? "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-500 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40"
                                : p === "HIGH"
                                ? "bg-[#b8287a]/10 text-[#9d1d66] border-[#b8287a]/30 ring-1 ring-[#b8287a] dark:bg-[#b8287a]/20 dark:text-[#f472b6] dark:border-[#b8287a]/40"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-[#10b981] dark:bg-[#10b981]/20 dark:text-[#10b981] dark:border-[#10b981]/40"
                              : "border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {relevantTechnicians.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Preferred technician
                        </label>
                        <span className="text-[10px] text-zinc-500">Optional</span>
                      </div>
                      <select
                        value={reportPreferredTechId}
                        onChange={(e) => setReportPreferredTechId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 text-xs focus:ring-1 focus:ring-[#10b981] outline-none"
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

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-white/5">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      disabled={isSubmittingReport}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-white/10 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport || (subscription.isExhausted && !reportAsQuotation)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>
                        {isSubmittingReport
                          ? "Submitting…"
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
