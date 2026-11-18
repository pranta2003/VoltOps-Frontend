import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { Invoice } from "../../types";
import { customerService } from "../../services/customerService";
import { operationalStore } from "../../services/operationalStore";
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  PrinterIcon,
  ClockIcon,
  AlertTriangleIcon,
} from "../../components/Icons";

export function CustomerInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  function loadInvoices() {
    setIsLoading(true);
    setError(null);
    customerService
      .getInvoices(user?.id)
      .then((res) => {
        setInvoices(res.data);
        if (res.data.length > 0) {
          setSelectedInvoice((prev) => {
            if (prev) {
              const updated = res.data.find((i) => i.id === prev.id);
              if (updated) return updated;
            }
            return res.data[0];
          });
        } else {
          setSelectedInvoice(null);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load invoices.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    loadInvoices();
    const unsubscribe = operationalStore.subscribe(() => {
      loadInvoices();
    });
    return unsubscribe;
  }, [user?.id]);

  const handlePayNow = async () => {
    if (!selectedInvoice || isPaying) return;
    setIsPaying(true);

    try {
      const res = await customerService.initiatePayment(selectedInvoice.id);
      setSelectedInvoice(res.data);
      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setIsPaying(false);
      }, 3000);
    } catch (err: any) {
      setIsPaying(false);
      alert(err.message || "Payment transaction failed.");
    }
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-[#10b981] dark:border-emerald-500/20 font-semibold";
      case "PAYMENT_PENDING":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20 font-semibold";
      case "PAYMENT_DUE":
      default:
        return "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-semibold";
    }
  };

  // Top Strip Metrics
  const outstandingBalance = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== "PAID")
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [invoices]);

  const dueInvoicesCount = useMemo(() => {
    return invoices.filter((inv) => inv.status !== "PAID").length;
  }, [invoices]);

  const subscription = customerService.getSubscription(user?.id);

  return (
    <Layout title="Invoices">
      <div className="space-y-6 max-w-6xl mx-auto pb-24">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadInvoices}
              className="font-bold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Billing Summary Strip (3 Compact Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Outstanding Balance */}
          <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
            <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold block">
              Outstanding Balance
            </span>
            <div className="text-2xl font-bold font-heading tabular-nums text-zinc-950 dark:text-zinc-100">
              ${outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-700 dark:text-zinc-400 font-medium">
              Across {dueInvoicesCount} pending statement{dueInvoicesCount === 1 ? "" : "s"}
            </div>
          </div>

          {/* Card 2: Active Subscription */}
          <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold block">
                Active Subscription
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            </div>
            <div className="text-lg font-bold font-heading text-zinc-950 dark:text-zinc-100 truncate">
              {subscription.planName}
            </div>
            <div className="text-[11px] text-zinc-700 dark:text-zinc-400 font-medium">
              Billing cycle resets {subscription.billingCycleResetDate}
            </div>
          </div>

          {/* Card 3: Invoices Due */}
          <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
            <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold block">
              Invoices Due
            </span>
            <div className={`text-2xl font-bold font-heading tabular-nums ${
              dueInvoicesCount > 0 ? "text-[#8a1858] dark:text-[#f472b6]" : "text-emerald-800 dark:text-[#10b981]"
            }`}>
              {dueInvoicesCount}
            </div>
            <div className="text-[11px] text-zinc-700 dark:text-zinc-400 font-medium">
              {dueInvoicesCount > 0 ? "Settlement requested prior to due date" : "All statements current"}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/90 dark:border-white/5">
            Loading commercial invoices and itemized statements…
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/90 dark:border-white/5 space-y-3">
            <div className="text-base font-bold text-zinc-950 dark:text-zinc-100">No Billing Statements Available</div>
            <p className="max-w-md mx-auto text-zinc-700 dark:text-zinc-400 font-medium">
              Invoices are automatically generated upon technician completion and verification of on-site work orders.
            </p>
            <Link
              to="/customer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950"
            >
              <span>View Service Requests</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Invoice Listing (Master) */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 flex items-center justify-between px-1">
                <span>Billing Statements</span>
                <span className="font-mono tabular-nums text-xs font-bold text-emerald-800 dark:text-[#10b981]">
                  {invoices.length} Total
                </span>
              </div>

              <div className="space-y-2">
                {invoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "border-[#10b981] bg-emerald-50/60 dark:bg-zinc-900 shadow-sm ring-1 ring-[#10b981]"
                          : "border-zinc-200/90 dark:border-white/5 bg-white dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/10 hover:text-zinc-950 dark:hover:text-zinc-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono tabular-nums font-bold text-xs text-zinc-950 dark:text-zinc-100">{inv.id}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            inv.status
                          )}`}
                        >
                          {inv.status === "PAID"
                            ? "Paid"
                            : inv.status === "PAYMENT_PENDING"
                            ? "Gateway Pending"
                            : "Payment Due"}
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs font-semibold text-zinc-950 dark:text-zinc-200 truncate">
                        {inv.assetName}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Due {inv.dueDate}</span>
                        <span className="font-mono font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                          ${inv.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Full Itemized Invoice Detail */}
            {selectedInvoice && (
              <div className="lg:col-span-8 p-6 sm:p-7 rounded-xl border border-zinc-200/90 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/90 dark:border-white/5 pb-5">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono font-bold text-emerald-800 dark:text-[#10b981] uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      <span>VoltOps Commercial Operations</span>
                    </div>
                    <h2 className="font-heading font-extrabold text-2xl text-zinc-950 dark:text-zinc-50 tracking-tight">
                      {selectedInvoice.id}
                    </h2>
                    <div className="text-xs text-zinc-700 dark:text-zinc-400 mt-1 font-medium">
                      Work Order:{" "}
                      <span className="font-mono font-semibold text-zinc-950 dark:text-zinc-200">
                        {selectedInvoice.workOrderId}
                      </span>{" "}
                      · {selectedInvoice.assetName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                        selectedInvoice.status
                      )}`}
                    >
                      {selectedInvoice.status === "PAID"
                        ? "Paid in Full"
                        : selectedInvoice.status === "PAYMENT_PENDING"
                        ? "Gateway Pending"
                        : "Payment Due"}
                    </span>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-2xs"
                      title="Print invoice or save as PDF"
                    >
                      <PrinterIcon size={13} />
                      <span>Print / PDF</span>
                    </button>

                    {selectedInvoice.status === "PAYMENT_DUE" && (
                      <button
                        type="button"
                        onClick={handlePayNow}
                        disabled={isPaying}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] text-zinc-950 hover:bg-[#34d399] transition-all shadow-sm disabled:opacity-50"
                      >
                        {isPaying ? "Connecting Gateway…" : "Initiate Payment"}
                      </button>
                    )}
                    {selectedInvoice.status === "PAYMENT_PENDING" && (
                      <span className="text-[11px] text-cyan-800 dark:text-cyan-400 font-semibold italic">
                        Webhook Pending
                      </span>
                    )}
                  </div>
                </div>

                {paySuccess && (
                  <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircleIcon size={16} />
                    <span>Payment initiated (Demo Mode). Gateway webhook confirmation pending.</span>
                  </div>
                )}

                {/* Metadata Grid (Generous spacing, no awkward truncation) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-white/5">
                    <span className="text-zinc-600 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Customer Account</span>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-200 block mt-1 leading-snug">
                      {selectedInvoice.customerName}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-white/5">
                    <span className="text-zinc-600 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Billing Date</span>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-200 block mt-1 tabular-nums">
                      {selectedInvoice.billingDate}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-white/5">
                    <span className="text-zinc-600 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Payment Due</span>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-200 block mt-1 tabular-nums">
                      {selectedInvoice.dueDate}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/90 dark:border-white/5">
                    <span className="text-zinc-600 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Coverage Plan</span>
                    <span className="font-semibold text-emerald-800 dark:text-[#10b981] block mt-1">
                      {subscription.planName}
                    </span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border border-zinc-200/90 dark:border-white/5 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-zinc-600 dark:text-zinc-400 border-b border-zinc-200/90 dark:border-white/5 bg-zinc-100/90 dark:bg-zinc-950/80 text-[11px] font-semibold">
                        <th className="py-3 px-4">Line Item Description</th>
                        <th className="py-3 px-3 text-center w-20">Qty</th>
                        <th className="py-3 px-3 text-right w-28">Unit Price</th>
                        <th className="py-3 px-4 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/90 dark:divide-white/5">
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-100/60 dark:hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-zinc-950 dark:text-zinc-200">{item.description}</td>
                          <td className="py-3.5 px-3 text-center text-zinc-700 dark:text-zinc-400 font-medium tabular-nums">{item.quantity}</td>
                          <td className="py-3.5 px-3 text-right text-zinc-700 dark:text-zinc-400 font-medium tabular-nums">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                            ${item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Breakdown */}
                <div className="flex flex-col items-end text-xs space-y-2 pt-1">
                  <div className="flex justify-between w-64 text-zinc-700 dark:text-zinc-400">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-mono tabular-nums font-semibold text-zinc-950 dark:text-zinc-200">
                      ${selectedInvoice.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between w-64 text-zinc-700 dark:text-zinc-400">
                    <span className="font-medium">VAT / Tax ({(selectedInvoice.taxRate * 100).toFixed(0)}%):</span>
                    <span className="font-mono tabular-nums font-semibold text-zinc-950 dark:text-zinc-200">
                      ${selectedInvoice.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between w-64 font-heading font-extrabold text-base text-zinc-950 dark:text-zinc-100 border-t border-zinc-200/90 dark:border-white/10 pt-2.5">
                    <span>Total Amount:</span>
                    <span className="text-emerald-800 dark:text-[#10b981] font-mono tabular-nums">
                      ${selectedInvoice.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Truthful Preview Disclaimer */}
                <div className="text-[11px] text-zinc-600 dark:text-zinc-500 border-t border-zinc-200/90 dark:border-white/5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>UI preview only · No live banking transaction processed</span>
                  {selectedInvoice.paymentNotice && (
                    <span className="italic">{selectedInvoice.paymentNotice}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
