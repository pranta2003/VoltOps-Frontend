import React from "react";
import { CustomerPurchase } from "../types";
import { formatBdt } from "../config/coveragePricing";
import { XIcon, PrinterIcon, ShieldCheckIcon, CheckCircleIcon } from "./Icons";

interface DemonstrationReceiptModalProps {
  purchase: CustomerPurchase;
  onClose: () => void;
  onContinueToPortal?: () => void;
}

export function DemonstrationReceiptModal({
  purchase,
  onClose,
  onContinueToPortal,
}: DemonstrationReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(purchase.date).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-3xl border border-[var(--border)] shadow-2xl p-6 sm:p-8 space-y-6 relative print:shadow-none print:border-none print:p-0"
        style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
      >
        {/* Modal Close Button (hidden when printing) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] print:hidden transition-colors"
          title="Close Receipt"
          aria-label="Close"
        >
          <XIcon size={18} />
        </button>

        {/* Header / Watermark Notice */}
        <div className="border-b border-[var(--border)] pb-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-base border border-emerald-500/20">
                ⚡
              </span>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[var(--text-primary)]">
                  VoltOps
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                  Commercial Facility Coordination
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {purchase.paymentStatus}
              </span>
              <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                {purchase.receiptId}
              </div>
            </div>
          </div>

          {/* Honest Demonstration Disclaimer */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <ShieldCheckIcon size={14} className="shrink-0 text-amber-600" />
            <span>
              <strong>Demonstration Receipt:</strong> Simulated subscription checkout in Local Preview Mode. No real funds were charged.
            </span>
          </div>
        </div>

        {/* Customer & Transaction Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-0.5">
              Customer / Facility
            </span>
            <div className="font-bold text-[var(--text-primary)]">{purchase.customerName}</div>
            <div className="text-[var(--text-secondary)]">{purchase.company}</div>
            <div className="text-[var(--text-muted)] text-[11px] truncate">{purchase.facilityAddress}</div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-0.5">
              Issue Date & Reference
            </span>
            <div className="font-semibold text-[var(--text-primary)]">{formattedDate}</div>
            <div className="text-[var(--text-secondary)]">Payment ID: {purchase.purchaseId}</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              Method: Demo Payment
            </div>
          </div>
        </div>

        {/* Itemized Order Breakdown */}
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--bg-surface-2)] text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Plan Description</th>
                <th className="py-2.5 px-3 text-center">Arrival SLA</th>
                <th className="py-2.5 px-3 text-center">Visits</th>
                <th className="py-2.5 px-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
              <tr>
                <td className="py-3 px-3.5 font-medium">
                  <div>{purchase.planName}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Billing Period: {purchase.billingPeriod}
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                  {purchase.arrivalSla}
                </td>
                <td className="py-3 px-3 text-center font-bold">
                  {purchase.includedVisits}
                </td>
                <td className="py-3 px-3.5 text-right font-mono font-bold">
                  {formatBdt(purchase.amount)}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-[var(--bg-surface-2)] text-xs border-t border-[var(--border)]">
              <tr>
                <td colSpan={3} className="py-2 px-3.5 text-right text-[var(--text-muted)]">
                  Subtotal (Base Plan)
                </td>
                <td className="py-2 px-3.5 text-right font-mono">
                  {formatBdt(purchase.amount)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1.5 px-3.5 text-right text-[var(--text-muted)]">
                  VAT (5% Prototype Rate)
                </td>
                <td className="py-1.5 px-3.5 text-right font-mono text-[var(--text-secondary)]">
                  {formatBdt(purchase.vatAmount)}
                </td>
              </tr>
              <tr className="border-t border-[var(--border)] font-bold text-sm">
                <td colSpan={3} className="py-2.5 px-3.5 text-right text-[var(--text-primary)]">
                  Total Paid (Demo)
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatBdt(purchase.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions (hidden when printing) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-surface-2)] text-[var(--text-primary)] transition-all flex items-center justify-center gap-2"
          >
            <PrinterIcon size={15} />
            <span>Print / Save as PDF</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onContinueToPortal && (
              <button
                type="button"
                onClick={onContinueToPortal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircleIcon size={15} />
                <span>Open Customer Portal</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
