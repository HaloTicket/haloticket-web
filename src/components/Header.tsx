import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/context/ThemeContext";
import {
  FiSearch,
  FiPlusCircle,
  FiSun,
  FiMoon,
  FiUser
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [lang, setLang] = useState<"vi" | "en">("vi");

  const categories = [
    { label: "Nhạc sống", path: "/category/music" },
    { label: "Sân khấu & Nghệ thuật", path: "/category/stage" },
    { label: "Thể Thao", path: "/category/sports" },
    { label: "Hội thảo & Workshop", path: "/category/workshop" },
    { label: "Tham quan & Trải nghiệm", path: "/category/experience" },
    { label: "Khác", path: "/category/others" },
    { label: "Vé bán lại", path: "/resale", isResale: true },
    { label: "Blog", path: "/blog" }
  ];

  return (
    <header className="sticky top-0 z-50 app-bg-header border-b app-border transition-colors duration-300">
      {/* Top Header Bar */}
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo with Glow */}
        <Link to={PATHS.HOME} className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform duration-300">
            <FaTicketAlt className="w-5 h-5 transform -rotate-12 animate-ticket-bounce" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight gradient-text">
            HaloTicket
          </span>
        </Link>

        {/* Search Bar Component */}
        <div className="hidden lg:flex items-center grow max-w-xl mx-4">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bạn tìm gì hôm nay?"
              className="w-full app-bg-card app-text-main placeholder-zinc-400 text-sm rounded-xl pl-4 pr-24 py-2.5 border app-border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
            />
            <button
              type="button"
              className="absolute right-1.5 px-4 py-1.5 gradient-btn text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
            >
              <FiSearch className="w-3.5 h-3.5" />
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl app-bg-card app-text-main hover:opacity-80 transition-all duration-200 focus:outline-none border app-border cursor-pointer shadow-xs"
            aria-label="Tắt/Mở Chế độ Tối"
            title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
          >
            {isDark ? (
              <FiSun className="w-5 h-5 text-amber-400 transform hover:rotate-90 transition-transform duration-500" />
            ) : (
              <FiMoon className="w-5 h-5 app-text-main hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Create Event Button */}
          <Link
            to="/organizer/create-event"
            className="hidden sm:inline-flex items-center gap-1.5 border app-border app-text-brand hover:opacity-80 px-4 py-2 rounded-full text-xs font-bold transition-all"
          >
            <FiPlusCircle className="w-4 h-4" />
            <span>Tạo sự kiện</span>
          </Link>

          {/* My Tickets */}
          <Link
            to={PATHS.MY_TICKETS}
            className="hidden md:inline-flex items-center gap-1.5 app-text-main app-hover-text-brand text-xs font-semibold px-3 py-2 transition-colors"
          >
            <FaTicketAlt className="w-4 h-4 app-text-brand" />
            <span>Vé của tôi</span>
          </Link>

          {/* Login / Register Button */}
          <Link
            to={PATHS.LOGIN}
            className="gradient-btn text-white px-4 py-2 rounded-full text-xs font-extrabold shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
          >
            <FiUser className="w-4 h-4" />
            <span>Đăng nhập | Đăng ký</span>
          </Link>

          {/* Language Flag Selector */}
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="flex items-center gap-1 px-2.5 py-1 app-bg-card border app-border rounded-lg text-xs app-text-main hover:opacity-80 transition-all cursor-pointer"
            title="Đổi ngôn ngữ"
          >
            {lang === "vi" ? (
              <span className="flex items-center gap-1">
                <span>🇻🇳</span>
                <span className="font-bold text-[10px]">VIE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span>🇬🇧</span>
                <span className="font-bold text-[10px]">ENG</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Header Category Navigation Bar */}
      <div className="app-bg-subnav border-t app-border overflow-x-auto no-scrollbar">
        <div className="container mx-auto px-4 md:px-8 flex items-center gap-6 text-xs md:text-sm font-medium whitespace-nowrap py-2.5">
          {categories.map((cat) => {
            const isActive = location.pathname === cat.path;
            return (
              <Link
                key={cat.label}
                to={cat.path}
                className={`transition-colors py-0.5 relative cursor-pointer ${
                  cat.isResale
                    ? "text-rose-500 font-extrabold hover:opacity-80 flex items-center gap-1"
                    : isActive
                    ? "app-text-brand font-bold"
                    : "app-text-main app-hover-text-brand"
                }`}
              >
                {cat.isResale && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
