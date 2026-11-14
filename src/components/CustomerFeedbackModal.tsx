import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/notificationService";
import { XIcon, StarIcon, CheckCircleIcon } from "./Icons";

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: (dismissWorkOrderId?: string) => void;
  workOrderId: string;
  technicianName?: string;
  assetName?: string;
  onSubmitSuccess?: () => void;
}

export function CustomerFeedbackModal({
  isOpen,
  onClose,
  workOrderId,
  technicianName,
  assetName,
  onSubmitSuccess,
}: CustomerFeedbackModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setHoveredRating(null);
      setComment("");
      setIsSubmitted(false);
    }
  }, [isOpen, workOrderId]);

  // Keyboard accessibility: Escape dismisses
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose(workOrderId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, workOrderId]);

  if (!isOpen) return null;

  const displayStars = hoveredRating !== null ? hoveredRating : rating;

  const handleSubmit = () => {
    if (rating === 0 || !workOrderId) return;

    notificationService.submitFeedback({
      workOrderId,
      rating,
      comment: comment.trim() || undefined,
      customerName: user?.name || "Apex Spinning & Weaving Mills",
      submittedAt: new Date().toISOString(),
    });

    setIsSubmitted(true);
    setTimeout(() => {
      if (onSubmitSuccess) onSubmitSuccess();
      onClose(workOrderId);
    }, 1200);
  };

  const handleDismiss = () => {
    onClose(workOrderId);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 id="feedback-dialog-title" className="font-heading font-bold text-base text-[var(--text-primary)]">
              How was your service?
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {workOrderId} {assetName ? `· ${assetName}` : ""}
              {technicianName ? ` · Tech: ${technicianName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close feedback prompt"
            className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors shrink-0"
          >
            <XIcon size={12} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-4 text-center space-y-2 animate-fade-in">
            <CheckCircleIcon size={28} className="mx-auto text-emerald-500" />
            <h4 className="font-bold text-xs text-[var(--text-primary)]">
              Thank you for your feedback!
            </h4>
            <p className="text-[11px] text-[var(--text-muted)]">
              Your rating has been recorded and shared with operations.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Star Rating Selector */}
            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= displayStars;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      className="p-1 text-amber-400 hover:scale-115 transition-transform focus:outline-none focus:ring-2 focus:ring-[#10b981] rounded-lg"
                    >
                      <StarIcon
                        size={24}
                        fill={isFilled ? "currentColor" : "none"}
                        className={isFilled ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {displayStars === 5
                  ? "Exceptional (5★)"
                  : displayStars === 4
                  ? "Very Good (4★)"
                  : displayStars === 3
                  ? "Satisfactory (3★)"
                  : displayStars === 2
                  ? "Needs Improvement (2★)"
                  : "Poor (1★)"}
              </span>
            </div>

            {/* Optional Short Comment */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 250))}
                rows={2}
                placeholder="Optional short comment (arrival, diagnostics, safety)..."
                className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[#10b981] transition-all"
              />
              <div className="text-right text-[10px] text-[var(--text-muted)]">
                {comment.length}/250
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={rating === 0}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm disabled:opacity-50"
              >
                Submit feedback
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
