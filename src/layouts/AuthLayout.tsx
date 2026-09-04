import { Outlet, Link } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { PATHS } from "@/routes/paths";

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <div className="auth-shell flex min-h-[100dvh] flex-col font-sans antialiased">

        {/* Minimal Auth Header */}
        <header className="auth-header flex items-center justify-between px-4 py-4 sm:px-8">
          <Link to={PATHS.HOME} className="flex min-h-11 items-center gap-2">
            <div className="auth-mark flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold">
              H
            </div>
            <span className="auth-brand-name text-xl font-extrabold">
              HaloTicket
            </span>
          </Link>
        </header>

        {/* Auth Content */}
        <main className="auth-main flex flex-1 items-center justify-center px-4 py-4 sm:px-8 sm:py-6">
          <Outlet />
        </main>

        {/* Minimal Auth Footer */}
        <footer className="auth-footer py-3 text-center text-xs">
          © {new Date().getFullYear()} HaloTicket. All rights reserved.
        </footer>
      </div>
    </ThemeProvider>
  );
}
