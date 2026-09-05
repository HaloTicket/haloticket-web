import { useState, useRef, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { PATHS } from "@/routes/paths";
import { VietnamFlag, UKFlag } from "@/components/common/FlagIcons";
import { FiSun, FiMoon, FiChevronDown } from "react-icons/fi";

function AuthLayoutContent() {
  const location = useLocation();
  const isLongForm = location.pathname === PATHS.REGISTER;
  const { isDark, toggleTheme } = useTheme();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">(() => {
    const saved = localStorage.getItem("app_lang");
    return saved === "en" ? "en" : "vi";
  });

  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`auth-shell ${
        isLongForm ? "auth-shell--long-form" : ""
      } font-sans antialiased`}
    >
      <header className="auth-header">
        <Link
          to={PATHS.HOME}
          className="auth-brand-link"
          aria-label="Về trang chủ HaloTicket"
        >
          <div className="auth-mark" aria-hidden="true">
            H
          </div>
          <span className="auth-brand-name">HaloTicket</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Flag Dropdown */}
          <div ref={langDropdownRef} className="relative group py-1">
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm font-medium hover:opacity-90 transition-all bg-secondary/60 hover:bg-secondary app-bg-subnav px-2.5 py-1.5 rounded-xl active:scale-95 cursor-pointer border app-border"
              title="Ngôn ngữ"
              aria-label="Chọn ngôn ngữ"
            >
              {lang === "vi" ? (
                <VietnamFlag className="w-5 h-5" />
              ) : (
                <UKFlag className="w-5 h-5" />
              )}
              <FiChevronDown
                className={`w-3 h-3 text-muted-foreground app-text-muted transition-transform duration-200 ${
                  isLangOpen ? "rotate-180" : "group-hover:rotate-180"
                }`}
              />
            </button>

            {/* Flag Dropdown Menu */}
            <div
              className={`absolute right-0 top-full pt-2 w-40 transition-all duration-200 z-50 origin-top-right ${
                isLangOpen
                  ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
                  : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
              }`}
            >
              <div className="app-bg-card border app-border rounded-2xl p-1.5 shadow-2xl space-y-1 animate-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setLang("vi");
                    localStorage.setItem("app_lang", "vi");
                    setIsLangOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left cursor-pointer ${
                    lang === "vi"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                      : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <VietnamFlag className="w-5 h-5" />
                  <span>Tiếng Việt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLang("en");
                    localStorage.setItem("app_lang", "en");
                    setIsLangOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left cursor-pointer ${
                    lang === "en"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                      : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <UKFlag className="w-5 h-5" />
                  <span>English</span>
                </button>
              </div>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="px-2 py-[6px] rounded-xl app-bg-card app-text-main hover:opacity-80 transition-all duration-200 focus:outline-none border app-border cursor-pointer shadow-xs"
            aria-label="Tắt/Mở Chế độ Tối"
            title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
          >
            {isDark ? (
              <FiSun className="w-5 h-5 text-amber-400 transform hover:rotate-90 transition-transform duration-500" />
            ) : (
              <FiMoon className="w-5 h-5 app-text-main hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>
        </div>
      </header>

      <main className="auth-main">
        <Outlet />
      </main>

      <footer className="auth-footer">
        © {new Date().getFullYear()} HaloTicket. All rights reserved.
      </footer>
    </div>
  );
}

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <AuthLayoutContent />
    </ThemeProvider>
  );
}
