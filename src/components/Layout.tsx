import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: ReactNode;
  title: string;
}

//export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
 // const { user, isLoading } = useAuth();

  //if (isLoading) {
   // return (
    //  <div className="flex h-screen items-center justify-center text-gray-500">
     //   Loading...
     // </div>
  //  );
 // } }
// One shared shell (sidebar + topbar) for every dashboard. When we build
// Milestone 2/3/4 pages, they wrap their content in <Layout title="...">
// instead of each page reinventing its own header/sidebar — this keeps the
// whole app visually consistent as it grows.
export function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-brand-dark text-white flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-lg font-semibold tracking-tight">VoltOps</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <div className="px-3 py-2 rounded-md bg-white/10 font-medium">Dashboard</div>
          {/* More links get added here as we build each milestone:
              Jobs, Technicians, Schedule, Reports, etc. */}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-sm">
          <div className="font-medium">{user?.name}</div>
          <div className="text-white/60 text-xs mb-3">{user?.role}</div>
          <button
            onClick={logout}
            className="w-full text-left text-white/80 hover:text-white transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
