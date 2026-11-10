import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { Invoice, InvoiceLineItem } from "../../types";
import { CheckCircleIcon, ClockIcon } from "../../components/Icons";

const MOCK_INVOICES: Invoice[] = [
  {
    id: "INV-4091",
    workOrderId: "WO-2048",
    customerId: "cust-1",
    customerName: "ABC Manufacturing Ltd",
    assetName: "Standby Generator G-01",
    billingDate: "10 Nov 2026",
    dueDate: "25 Nov 2026",
    status: "PAYMENT_DUE",
    items: [
      {
        id: "li-1",
        description: "Emergency Diagnostic Callout & ATS Inspection (24/7 Coverage Window)",
        quantity: 1,
        unitPrice: 120,
        totalPrice: 120,
      },
      {
        id: "li-2",
        description: "Replaced 400A Automatic Transfer Switch Coil & Contactor Assembly",
        quantity: 1,
        unitPrice: 380,
        totalPrice: 380,
      },
      {
        id: "li-3",
        description: "Certified High Voltage On-Site Load & Synchronization Testing (2.5 hrs)",
        quantity: 2.5,
        unitPrice: 60,
        totalPrice: 150,
      },
    ],
    subtotal: 650,
    taxRate: 0.05,
    taxAmount: 32.5,
    totalAmount: 682.5,
    paymentNotice: "Payment is a UI preview only. No real transaction will be processed.",
  },
];

export function CustomerInvoices() {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice>(MOCK_INVOICES[0]);
  const [paySuccess, setPaySuccess] = useState(false);

  const handlePayNow = () => {
    setPaySuccess(true);
    setTimeout(() => {
      setSelectedInvoice((prev: Invoice) => ({ ...prev, status: "PAID" as const }));
      setPaySuccess(false);
    }, 1500);
  };

  return (
    <Layout
      title="Invoices & Commercial Billing"
      subtitle="Figma Source: Customer invoice (1440 × 1024px) · Itemized work orders, labor, and certified repair charges"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
        {/* Left: Invoice Listing */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Billing Statements
          </div>
          {MOCK_INVOICES.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedInvoice.id === inv.id
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

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  selectedInvoice.status === "PAID"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                }`}
              >
                {selectedInvoice.status === "PAID" ? "✓ Paid in Full" : "● Payment Due"}
              </span>
            </div>
          </div>

          {/* Bill-To & Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)] block">Bill To:</span>
              <strong className="text-[var(--text-primary)] text-sm">{selectedInvoice.customerName}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block">Billing Date:</span>
              <strong className="text-[var(--text-primary)]">{selectedInvoice.billingDate}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block">Due Date:</span>
              <strong className="text-red-600 dark:text-red-400">{selectedInvoice.dueDate}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block">Coverage Plan:</span>
              <strong className="text-[#10b981]">24/7 Standard</strong>
            </div>
          </div>

          {/* Itemized Labor & Parts Table */}
          <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[var(--bg-surface-2)] border-b border-[var(--border)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Line Item Description</th>
                  <th className="py-3 px-4 text-center">Qty / Hrs</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {selectedInvoice.items.map((item: InvoiceLineItem) => (
                  <tr key={item.id} className="text-xs">
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                      {item.description}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[var(--text-muted)] font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[var(--text-muted)] font-mono">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold font-mono text-[var(--text-primary)]">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
            <div className="max-w-xs text-[11px] text-[var(--text-muted)] leading-relaxed italic bg-[var(--bg-surface-2)] p-3 rounded-xl border border-[var(--border)]">
              {selectedInvoice.paymentNotice}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Subtotal</span>
                <span className="font-mono">${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>VAT / Tax (5%)</span>
                <span className="font-mono">${selectedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-bold text-[var(--text-primary)]">
                <span>Total Due</span>
                <span className="font-mono text-[#10b981]">${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => alert("Downloading digital invoice PDF...")}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
            >
              Download PDF Statement
            </button>

            {selectedInvoice.status !== "PAID" ? (
              <button
                type="button"
                onClick={handlePayNow}
                disabled={paySuccess}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
              >
                {paySuccess ? "Processing..." : "Pay Now (Preview)"}
              </button>
            ) : (
              <span className="text-xs font-bold text-[#10b981]">✓ Transaction settled</span>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

