import { Outlet, Link } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { PATHS } from "@/routes/paths";

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <div className="app-bg-page flex min-h-screen flex-col justify-between font-sans antialiased transition-colors duration-300">

        {/* Minimal Auth Header */}
        <header className="flex items-center justify-between px-4 py-6 sm:px-8">
          <Link to={PATHS.HOME} className="flex min-h-11 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg app-bg-brand text-sm font-extrabold text-white">
              H
            </div>
            <span className="text-xl font-extrabold app-text-brand">
              HaloTicket
            </span>
          </Link>
        </header>

        {/* Auth Content */}
        <main className="flex flex-grow items-center justify-center p-4">
          <Outlet />
        </main>

        {/* Minimal Auth Footer */}
        <footer className="py-6 text-center text-xs app-text-muted">
          © {new Date().getFullYear()} HaloTicket. All rights reserved.
        </footer>
      </div>
    </ThemeProvider>
  );
}
