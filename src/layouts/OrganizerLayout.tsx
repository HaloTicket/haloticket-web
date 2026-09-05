import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/context/ThemeContext";
import { getKeycloakSession } from "@/services/keycloakSession";
import { getCachedUserProfile, userApi, type UserProfile } from "@/services/userApi";
import {
  FiStar,
  FiFolder,
  FiFileText,
  FiPlusCircle,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiHome,
  FiChevronDown,
  FiShield,
} from "react-icons/fi";
import {
  LuTicket,
  LuGem,
  LuCalendarDays,
  LuChartColumn,
  LuBuilding2,
  LuLogOut,
  LuUser,
} from "react-icons/lu";
import { FaTicketAlt } from "react-icons/fa";

export const OrganizerLayout: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    getKeycloakSession().isAuthenticated()
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    getCachedUserProfile()
  );

  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = () => {
      const authed = getKeycloakSession().isAuthenticated();
      setIsAuthenticated(authed);
      if (authed) {
        setUserProfile(getCachedUserProfile());
        userApi
          .getProfile()
          .then((data) => {
            if (data) setUserProfile(data);
          })
          .catch(() => {});
      } else {
        setUserProfile(null);
      }
    };

    const handleProfileUpdate = () => {
      setUserProfile(getCachedUserProfile());
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);
    window.addEventListener("user-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
      window.removeEventListener("user-updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await getKeycloakSession().logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    setIsAccountOpen(false);
    window.dispatchEvent(new Event("user-updated"));
    window.dispatchEvent(new Event("auth-changed"));
    navigate(PATHS.HOME, { replace: true });
  };

  const userInitial = (
    userProfile?.fullName?.[0] ||
    userProfile?.email?.[0] ||
    "M"
  ).toUpperCase();

  const isAdmin =
    userProfile?.roles?.some(
      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ROLE_ADMIN"
    ) || false;

  const sidebarItems = [
    {
      label: "Sự kiện của tôi",
      path: "/organizer/my-events",
      icon: <FiStar className="w-4 h-4 shrink-0" />,
    },
    {
      label: "Quản lý báo cáo",
      path: "/organizer/reports",
      icon: <FiFolder className="w-4 h-4 shrink-0" />,
    },
    {
      label: "Điều khoản Ban tổ chức",
      path: "/organizer/terms",
      icon: <FiFileText className="w-4 h-4 shrink-0" />,
    },
  ];

  const getHeaderTitle = () => {
    if (location.pathname === "/organizer/my-events") return "Sự kiện của tôi";
    if (location.pathname === "/organizer/reports") return "Quản lý báo cáo";
    if (location.pathname === "/organizer/terms") return "Điều khoản cho Ban tổ chức";
    if (location.pathname === "/organizer/create-event") return "Tạo sự kiện";
    return "Organizer Center";
  };

  return (
    <div className="min-h-screen flex app-bg-page transition-colors duration-300 font-sans antialiased">
      {/* Left side bar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 app-bg-card border-r app-border flex flex-col justify-between p-4 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Brand Logo & Organizer Center Title */}
          <div className="flex items-center justify-between pb-3 border-b app-border">
            <Link to={PATHS.HOME} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                <FaTicketAlt className="w-4 h-4 transform -rotate-12" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-blue-600 dark:text-blue-400 block leading-none">
                  Organizer Center
                </span>
                <span className="text-[10px] app-text-muted font-semibold">
                  HaloTicket Platform
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              to={PATHS.HOME}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mt-4 border-t app-border pt-3"
            >
              <FiHome className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Quay lại HaloTicket</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Language Switcher */}
        <div className="pt-4 border-t app-border flex items-center justify-between">
          <span className="text-xs font-bold app-text-muted">Ngôn ngữ</span>
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl app-bg-subnav border app-border text-xs font-bold app-text-main cursor-pointer shadow-xs"
          >
            <span className="text-sm">{lang === "vi" ? "🇻🇳" : "🇬🇧"}</span>
            <span>{lang === "vi" ? "Vie" : "Eng"}</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Right main content area  */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 app-bg-header border-b app-border backdrop-blur-md px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl app-bg-card border app-border app-text-main cursor-pointer"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <h1 className="text-base md:text-lg font-black app-text-main tracking-tight">
              {getHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Create Event CTA */}
            <Link
              to="/organizer/create-event"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FiPlusCircle className="w-4 h-4" />
              <span>Tạo sự kiện</span>
            </Link>

            {/* Dark Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl app-bg-card app-text-main border app-border hover:opacity-80 transition-all cursor-pointer"
              title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
            >
              {isDark ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4" />}
            </button>

            {/* User Profile Account Dropdown (Synchronized with MainLayout Header) */}
            {isAuthenticated ? (
              <div ref={accountDropdownRef} className="relative group py-1">
                <button
                  type="button"
                  onClick={() => setIsAccountOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer active:scale-95"
                  aria-expanded={isAccountOpen}
                  aria-haspopup="menu"
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-[10px]">
                    {userInitial}
                  </span>
                  <span className="hidden sm:inline">
                    {userProfile?.fullName || "Tài khoản"}
                  </span>
                  <FiChevronDown
                    className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${
                      isAccountOpen ? "rotate-180" : "group-hover:rotate-180"
                    }`}
                  />
                </button>

                {/* Account Hover Dropdown Menu */}
                <div
                  className={`absolute right-0 top-full pt-2 w-56 transition-all duration-200 z-50 origin-top-right ${
                    isAccountOpen
                      ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
                      : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
                  }`}
                  role="menu"
                >
                  <div className="app-bg-card border app-border rounded-2xl p-2 shadow-2xl space-y-1 app-text-main animate-in zoom-in-95">
                    {/* Customer section */}
                    <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                      Cá nhân
                    </div>

                    <Link
                      to={PATHS.MY_TICKETS}
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                    >
                      <LuTicket className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Vé của tôi</span>
                    </Link>

                    <Link
                      to={PATHS.PROFILE}
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                    >
                      <LuUser className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Thông tin cá nhân</span>
                    </Link>

                    <Link
                      to="/profile?tab=membership"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                    >
                      <LuGem className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Thẻ thành viên</span>
                    </Link>

                    <div className="my-1 border-t app-border" />

                    {/* Organizer section */}
                    <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                      Ban Tổ Chức
                    </div>

                    <Link
                      to={PATHS.MY_EVENTS}
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                    >
                      <LuCalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Quản lý sự kiện</span>
                    </Link>

                    <Link
                      to={PATHS.REPORTS}
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                    >
                      <LuChartColumn className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Báo cáo doanh thu</span>
                    </Link>

                    <Link
                      to={PATHS.TERMS}
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                    >
                      <LuBuilding2 className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>Hồ sơ Ban tổ chức</span>
                    </Link>

                    <div className="my-1 border-t app-border" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                    >
                      <LuLogOut className="w-4 h-4 shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to={PATHS.LOGIN}
                className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </header>

        {/* Dynamic Organizer Page Content (CreateEvent, etc.) */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OrganizerLayout;
