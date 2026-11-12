import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { CustomerAsset, CANONICAL_SERVICE_CATEGORIES, ServiceCategory } from "../../types";
import { customerService } from "../../services/customerService";
import { operationalStore } from "../../services/operationalStore";
import {
  WrenchIcon,
  SearchIcon,
  XIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  ClockIcon,
  ArrowRightIcon,
  BuildingIcon,
  ShieldCheckIcon,
  EyeIcon,
} from "../../components/Icons";

export function FacilityAssets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CustomerAsset | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  return (
    <Layout
      title="Facility Assets"
      subtitle={`Commercial equipment registry for ${user?.company || "Apex Spinning & Weaving Mills, Savar"}`}
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
        {/* ── Summary KPI Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Registered Assets</span>
              <BuildingIcon size={16} className="text-[#10b981]" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
              {isLoading ? "—" : totalCount}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">Commercial facility equipment inventory</div>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <span>Operational Baseline</span>
              <CheckCircleIcon size={16} className="text-emerald-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-emerald-700 dark:text-emerald-400">
              {isLoading ? "—" : operationalCount}
            </div>
            <div className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium">
              Verified normal operating parameters
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <span>Attention Required</span>
              <AlertTriangleIcon size={16} className="text-amber-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-amber-700 dark:text-amber-400">
              {isLoading ? "—" : attentionCount}
            </div>
            <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80 font-medium">
              Needs inspection, calibration, or repair
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

        {/* ── Asset Inventory Table / Cards ───────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Asset & Tag</th>
                  <th className="py-3 px-4">Service Category</th>
                  <th className="py-3 px-4">Facility Location</th>
                  <th className="py-3 px-4">Operational Status</th>
                  <th className="py-3 px-4">Service Chronology</th>
                  <th className="py-3 px-4">Active Breakdown</th>
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
                    return (
                      <tr key={asset.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{asset.name}</div>
                          <div className="font-mono text-[11px] text-[var(--text-muted)]">Tag: {asset.tagNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-muted)]">
                          {asset.category}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[var(--text-primary)] font-medium">{asset.location}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border font-semibold ${getStatusBadge(
                              asset.status
                            )}`}
                          >
                            {asset.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {asset.lastServiceDate ? (
                            <div>
                              <span className="text-[var(--text-primary)] font-medium block">
                                Last: {asset.lastServiceDate}
                              </span>
                              {asset.installedDate && (
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  Installed: {asset.installedDate}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {linkedReq ? (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                              <AlertTriangleIcon size={13} className="shrink-0" />
                              <span>{linkedReq.id} ({linkedReq.priority})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-normal">None active</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAsset(asset)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all flex items-center gap-1"
                            >
                              <EyeIcon size={12} />
                              <span>Specs</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/customer/new-request`)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 transition-all flex items-center gap-1"
                              title="Report breakdown for this asset"
                            >
                              <WrenchIcon size={12} />
                              <span>Report</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Asset Specifications Modal ──────────────────────────────────── */}
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Asset Passport & Specifications
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
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Asset ID & Tag</span>
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
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Operational Status</span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] border font-bold ${getStatusBadge(
                        selectedAsset.status
                      )}`}
                    >
                      {selectedAsset.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Commissioning Date</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.installedDate || "Not recorded"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Latest Service Milestone</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.lastServiceDate || "None"}</span>
                  </div>
                </div>

                {getLinkedRequest(selectedAsset.name) ? (
                  <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                    <div className="font-bold text-amber-700 dark:text-amber-300">Active Incident Associated:</div>
                    <div className="text-[11px] text-[var(--text-primary)]">
                      {getLinkedRequest(selectedAsset.name)?.id} — {getLinkedRequest(selectedAsset.name)?.problemTitle}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-xs">
                    No active breakdown tickets currently open for this asset.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAsset(null);
                    navigate("/customer/new-request");
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
      </div>
    </Layout>
  );
}
