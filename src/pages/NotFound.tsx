import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 text-[#10b981] font-extrabold text-2xl flex items-center justify-center mb-4">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-2">Page Not Found</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm">
        The route you are attempting to reach does not exist or has been relocated.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  );
}
