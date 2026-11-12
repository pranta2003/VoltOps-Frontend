import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { Invoice } from "../../types";
import { customerService } from "../../services/customerService";
import { operationalStore } from "../../services/operationalStore";
import { CheckCircleIcon, ClockIcon, ArrowRightIcon } from "../../components/Icons";

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
      const res = await customerService.payInvoice(selectedInvoice.id);
      setSelectedInvoice(res.data);
      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setIsPaying(false);
      }, 2000);
    } catch (err: any) {
      setIsPaying(false);
      alert(err.message || "Payment transaction failed.");
    }
  };

  return (
    <Layout
      title="Invoices & Commercial Billing"
      subtitle="Figma Source: Customer invoice (1440 × 1024px) · Itemized work orders, labor, and certified repair charges"
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
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

        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)]">
            Loading commercial invoices and itemized billing statements...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] space-y-3">
            <div className="text-base font-bold text-[var(--text-primary)]">No Billing Statements Available</div>
            <p className="max-w-md mx-auto">
              Invoices are automatically generated upon technician completion and verification of on-site work orders.
            </p>
            <Link
              to="/customer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e]"
            >
              <span>View Service Requests</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Invoice Listing */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>Billing Statements</span>
                <span className="text-[11px] font-normal text-[#10b981]">
                  {invoices.length} Total
                </span>
              </div>
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedInvoice?.id === inv.id
                      ? "border-[#10b981] bg-[var(--bg-surface)] shadow-md ring-1 ring-[#10b981]"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{inv.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inv.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {inv.status === "PAID" ? "PAID" : "PAYMENT DUE"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-[var(--text-primary)]">
                    Work Order: {inv.workOrderId} ({inv.assetName})
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Due {inv.dueDate}</span>
                    <span className="font-bold text-[var(--text-primary)]">${inv.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Full Itemized Invoice (Figma Customer invoice Frame) */}
            {selectedInvoice && (
              <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#10b981]">
                      Official Commercial Invoice
                    </div>
                    <h2 className="font-heading font-extrabold text-2xl text-[var(--text-primary)]">
                      {selectedInvoice.id}
                    </h2>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Linked Work Order: <span className="font-mono font-bold text-[var(--text-primary)]">{selectedInvoice.workOrderId}</span> · {selectedInvoice.assetName}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        selectedInvoice.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {selectedInvoice.status === "PAID" ? "Paid in Full" : "Payment Due"}
                    </span>
                    {selectedInvoice.status !== "PAID" && (
                      <button
                        type="button"
                        onClick={handlePayNow}
                        disabled={isPaying}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm disabled:opacity-50"
                      >
                        {isPaying ? "Processing..." : "Pay Now"}
                      </button>
                    )}
                  </div>
                </div>

                {paySuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircleIcon size={16} />
                    <span>Payment recorded successfully! Invoice status updated to PAID.</span>
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block">Customer Account</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedInvoice.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Billing Date</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedInvoice.billingDate}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Payment Due</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedInvoice.dueDate}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Coverage Plan</span>
                    <span className="font-bold text-[#10b981]">24/7 Standard</span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="overflow-x-auto border-t border-[var(--border)] pt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Line Item Description</th>
                        <th className="py-2.5 text-center">Qty / Hrs</th>
                        <th className="py-2.5 text-right">Unit Price</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 font-medium text-[var(--text-primary)]">{item.description}</td>
                          <td className="py-3 text-center text-[var(--text-muted)]">{item.quantity}</td>
                          <td className="py-3 text-right text-[var(--text-muted)]">${item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                            ${item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Breakdown */}
                <div className="border-t border-[var(--border)] pt-4 flex flex-col items-end text-xs space-y-1.5">
                  <div className="flex justify-between w-48 text-[var(--text-muted)]">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-48 text-[var(--text-muted)]">
                    <span>VAT / Tax ({(selectedInvoice.taxRate * 100).toFixed(0)}%):</span>
                    <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-48 font-heading font-extrabold text-base text-[var(--text-primary)] border-t border-[var(--border)] pt-2">
                    <span>Total Amount:</span>
                    <span className="text-[#10b981]">${selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {selectedInvoice.paymentNotice && (
                  <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-4 italic">
                    Note: {selectedInvoice.paymentNotice}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
