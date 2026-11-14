import { useState, useEffect, useRef, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { CustomerSupportTicket, SUPPORT_CATEGORIES, SupportIssueCategory } from "../types/support";
import { XIcon, SendIcon, AlertTriangleIcon, CheckCircleIcon } from "./Icons";

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRelatedId?: string;
}

const SUPPORT_EMAIL_DESTINATION = "prantakumerpandit@gmail.com";

export function CustomerSupportModal({
  isOpen,
  onClose,
  defaultRelatedId = "",
}: CustomerSupportModalProps) {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [facility, setFacility] = useState(user?.company || "Apex Spinning & Weaving Mills, Savar");
  const [relatedId, setRelatedId] = useState(defaultRelatedId);
  const [category, setCategory] = useState<SupportIssueCategory>("SERVICE_QUALITY");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Sync defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setFacility(user?.company || "Apex Spinning & Weaving Mills, Savar");
      setRelatedId(defaultRelatedId);
      setValidationError(null);
      setIsSuccess(false);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, user, defaultRelatedId]);

  // Keyboard accessibility: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (!name.trim()) {
      setValidationError("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setValidationError("Please enter a valid business email address.");
      return;
    }
    if (!facility.trim()) {
      setValidationError("Please specify your facility name.");
      return;
    }
    if (!subject.trim() || subject.trim().length < 4) {
      setValidationError("Please provide a descriptive subject (at least 4 characters).");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setValidationError("Please explain your inquiry or issue (at least 10 characters).");
      return;
    }

    const ticket: CustomerSupportTicket = {
      name: name.trim(),
      email: email.trim(),
      facility: facility.trim(),
      relatedId: relatedId.trim() || undefined,
      category,
      subject: subject.trim(),
      message: message.trim(),
      submittedAt: new Date().toISOString(),
    };

    const categoryLabel =
      SUPPORT_CATEGORIES.find((c) => c.value === category)?.label || category;

    // Compose formatted email body for mailto dispatch
    const emailSubject = `[VoltOps Support] ${ticket.category} - ${ticket.subject}`;
    const emailBody = [
      "VOLTOPS CUSTOMER SUPPORT / ISSUE REPORT",
      "========================================",
      `Submitted By: ${ticket.name}`,
      `Business Email: ${ticket.email}`,
      `Facility Name: ${ticket.facility}`,
      `Category: ${categoryLabel}`,
      ticket.relatedId ? `Related Request / Work Order: ${ticket.relatedId}` : "Related ID: None",
      `Timestamp: ${ticket.submittedAt}`,
      "========================================",
      "",
      "MESSAGE:",
      ticket.message,
      "",
      "----------------------------------------",
      "Dispatched from VoltOps Enterprise Customer Portal",
    ].join("\n");

    const mailtoUrl = `mailto:${SUPPORT_EMAIL_DESTINATION}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    // Trigger user's configured mail application
    window.location.href = mailtoUrl;

    setIsSuccess(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Operations Assistance
            </span>
            <h3 id="support-modal-title" className="font-heading font-bold text-lg text-[var(--text-primary)]">
              Contact Support / Report an Issue
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-3 animate-fade-in text-center">
            <CheckCircleIcon size={28} className="mx-auto text-emerald-500" />
            <h4 className="font-bold text-sm text-[var(--text-primary)]">
              Mail Client Launched
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
              Your default email application has been opened with your support ticket pre-filled and addressed to{" "}
              <strong className="text-[var(--text-primary)] font-mono">{SUPPORT_EMAIL_DESTINATION}</strong>.
              Please verify the details and press send in your email client.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {validationError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangleIcon size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Your Name *
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Facility Name *
                </label>
                <input
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Related Request / WO (Optional)
                </label>
                <input
                  type="text"
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  placeholder="e.g. SR-1024 or WO-2998"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Issue Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportIssueCategory)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of issue or question..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Message Details *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe your inquiry, affected equipment, or urgent assistance required..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                required
              />
            </div>

            {/* Honest Email Dispatcher Note */}
            <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">Email Dispatch Notice:</strong> Submitting will launch your default email program addressed to{" "}
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{SUPPORT_EMAIL_DESTINATION}</span> with your inquiry details. Please confirm and send from your email application.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
              >
                <SendIcon size={13} />
                <span>Open Mail Client & Send</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
