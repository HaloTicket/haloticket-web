import { Outlet, Link } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { PATHS } from "@/routes/paths";

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans antialiased relative overflow-hidden">
        {/* Subtle Background Glow Spheres */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-brand-600/20 to-accent-cyan/15 blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Minimal Auth Header */}
        <header className="py-6 px-8 flex justify-between items-center">
          <Link to={PATHS.HOME} className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white font-extrabold text-sm">
              H
            </div>
            <span className="text-xl font-extrabold tracking-tight gradient-text">
              HaloTicket
            </span>
          </Link>
        </header>

        {/* Auth Content */}
        <main className="flex-grow flex items-center justify-center p-4">
          <Outlet />
        </main>

        {/* Minimal Auth Footer */}
        <footer className="py-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} HaloTicket. All rights reserved.
        </footer>
      </div>
    </ThemeProvider>
  );
}
