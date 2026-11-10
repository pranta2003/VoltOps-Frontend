import { Link } from "react-router-dom";

export function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-2xl flex items-center justify-center mb-4">
        !
      </div>
      <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-2">Access Denied</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm">
        Your authenticated account role does not have permission to view this internal workspace.
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
