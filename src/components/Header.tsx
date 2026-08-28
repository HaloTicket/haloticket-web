import { Link, useLocation } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/hooks/useTheme";

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="glass-header sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-8 py-3.5 flex justify-between items-center">
        {/* Brand Logo with Glow */}
        <Link
          to={PATHS.HOME}
          className="flex items-center space-x-2 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300">
            <svg
              className="w-5 h-5 animate-ticket-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
          <span className="text-2xl font-extrabold tracking-tight gradient-text">
            HaloTicket
          </span>
        </Link>

        {/* Main Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to={PATHS.HOME}
            className={`font-semibold text-sm transition-all duration-200 relative py-1 ${
              isActive(PATHS.HOME)
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400"
            }`}
          >
            Khám phá sự kiện
            {isActive(PATHS.HOME) && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-brand-600 to-accent-cyan rounded-full animate-fade-in-up" />
            )}
          </Link>

          <Link
            to="#"
            className="font-semibold text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors py-1"
          >
            Tra cứu vé
          </Link>
        </nav>

        {/* Actions & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            aria-label="Chuyển giao diện Sáng/Tối"
            title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
          >
            {isDark ? (
              /* Sun Icon for Dark mode */
              <svg
                className="w-5 h-5 text-amber-400 transform rotate-0 hover:rotate-90 transition-transform duration-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              /* Moon Icon for Light mode */
              <svg
                className="w-5 h-5 text-slate-700 hover:-rotate-12 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Login Button */}
          <Link
            to={PATHS.LOGIN}
            className="gradient-btn text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md shadow-brand-500/20 active:scale-95 transition-all duration-200"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </header>
  );
}
