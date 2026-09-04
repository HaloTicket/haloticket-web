import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/context/ThemeContext";
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
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";

export const OrganizerLayout: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">("vi");

  const sidebarItems = [
    {
      label: "Sự kiện của tôi",
      path: "/organizer/my-events",
      icon: <FiStar className="w-4 h-4 shrink-0" />
    },
    {
      label: "Quản lý báo cáo",
      path: "/organizer/reports",
      icon: <FiFolder className="w-4 h-4 shrink-0" />
    },
    {
      label: "Điều khoản Ban tổ chức",
      path: "/organizer/terms",
      icon: <FiFileText className="w-4 h-4 shrink-0" />
    }
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
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 app-bg-card border-r app-border flex flex-col justify-between p-4 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
                <span className="text-[10px] app-text-muted font-semibold">HaloTicket Platform</span>
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive
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

            {/* Mock User Avatar Dropdown */}
            <div className="flex items-center gap-2 pl-2 border-l app-border">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                TL
              </div>
              <span className="text-xs font-extrabold app-text-main hidden sm:inline-block">
                Trần Long Vũ
              </span>
            </div>
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
