import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/context/ThemeContext";
import SearchOverlayModal from "./SearchOverlayModal";
import { addSearchHistory } from "@/utils/searchHistory";
import { eventApi } from "@/services/eventApi";
import {
  FiSearch,
  FiPlusCircle,
  FiSun,
  FiMoon,
  FiUser,
  FiMenu,
  FiX,
  FiCheck,
  FiChevronDown
} from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">("vi");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // sync searchQuery with URL on /search, or clear searchQuery when navigating away
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (location.pathname === "/search" && q) {
      setSearchQuery(q);
    } else {
      setSearchQuery("");
    }
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // close search overlay and language dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    addSearchHistory(trimmed);
    eventApi.logSearchQuery(trimmed);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const categories = [
    { label: "Nhạc sống", path: "/category/music" },
    { label: "Sân khấu & Nghệ thuật", path: "/category/stage" },
    { label: "Thể Thao", path: "/category/sports" },
    { label: "Hội thảo & Workshop", path: "/category/workshop" },
    { label: "Tham quan & Trải nghiệm", path: "/category/experience" },
    { label: "Khác", path: "/category/others" },
    { label: "Vé bán lại", path: "/resale-ticket", isResale: true },
    { label: "Blog", path: "/blog" }
  ];

  return (
    <header className="sticky top-0 z-50 app-bg-header border-b app-border transition-colors duration-300">
      {/* Top Header Bar with side padding */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 py-3.5 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to={PATHS.HOME} className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform duration-300">
            <FaTicketAlt className="w-5 h-5 transform -rotate-12 animate-ticket-bounce" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
            HaloTicket
          </span>
        </Link>

        {/* Search Bar Component & Overlay Modal (Desktop) */}
        <div ref={searchContainerRef} className="hidden lg:flex items-center grow max-w-xl mx-4 relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit(e);
                }
              }}
              placeholder="Bạn tìm gì hôm nay?"
              className="w-full app-bg-card app-text-main placeholder-zinc-400 text-sm rounded-xl pl-4 pr-24 py-2.5 border app-border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FiSearch className="w-3.5 h-3.5" />
              <span>Tìm kiếm</span>
            </button>
          </form>

          {/* Interactive Search Overlay Modal Popover */}
          <SearchOverlayModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            searchQuery={searchQuery}
            onSelectKeyword={(kw) => {
              addSearchHistory(kw);
              eventApi.logSearchQuery(kw);
              setSearchQuery(kw);
              navigate(`/search?q=${encodeURIComponent(kw)}`);
            }}
          />
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Button Create Event (Desktop) */}
          <Link
            to="/organizer/create-event"
            className="group hidden lg:inline-flex items-center gap-1.5 px-7 py-2 rounded-full text-xs font-extrabold transition-all duration-300 border border-blue-500/40 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <FiPlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500 shrink-0" />
            <span>Tạo sự kiện</span>
          </Link>

          {/* My Tickets (Desktop) */}
          <Link
            to={PATHS.MY_TICKETS}
            className="hidden lg:inline-flex items-center gap-1.5 app-text-main hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold px-3 py-2 transition-colors"
          >
            <FaTicketAlt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Vé của tôi</span>
          </Link>

          {/* Login / Register Button (Desktop) */}
          <Link
            to={PATHS.LOGIN}
            className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-extrabold shadow-xs transition-all active:scale-95 items-center gap-1.5"
          >
            <FiUser className="w-4 h-4" />
            <span>Đăng nhập | Đăng ký</span>
          </Link>

          {/* Dark Mode Switcher */}
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

          {/* Language Flag Selector with Seamless Group Hover & Touch Click Support */}
          <div
            ref={langDropdownRef}
            className="relative group py-1"
          >
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 app-bg-card border app-border rounded-xl text-xs app-text-main hover:border-blue-500/50 transition-all cursor-pointer shadow-xs"
              aria-label="Chọn ngôn ngữ"
            >
              {lang === "vi" ? (
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="text-base">🇻🇳</span>
                  <span>VIE</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="text-base">🇬🇧</span>
                  <span>ENG</span>
                </span>
              )}
              <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isLangOpen ? "rotate-180" : "group-hover:rotate-180"}`} />
            </button>

            {/* Continuous Hover Popover with Invisible Bridge Area */}
            <div
              className={`absolute right-0 top-full pt-1.5 w-40 z-50 transition-all duration-200 origin-top-right ${isLangOpen
                ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
                : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
                }`}
            >
              <div className="p-1.5 rounded-2xl app-bg-card border app-border shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setLang("vi");
                    setIsLangOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${lang === "vi"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                    : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇻🇳</span>
                    <span>Tiếng Việt</span>
                  </div>
                  {lang === "vi" && <FiCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLang("en");
                    setIsLangOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer mt-0.5 ${lang === "en"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                    : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇬🇧</span>
                    <span>English</span>
                  </div>
                  {lang === "en" && <FiCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Drawer Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-xl app-bg-card app-text-main border app-border hover:border-blue-500/50 transition-all cursor-pointer shadow-xs"
            aria-label="Mở menu"
          >
            {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sub-Header Category Navigation Bar (Desktop) */}
      <div className="hidden lg:block app-bg-subnav border-t app-border overflow-x-auto no-scrollbar">
        <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 flex items-center gap-6 text-xs md:text-sm font-medium whitespace-nowrap py-2.5">
          {categories.map((cat) => {
            const isActive = location.pathname === cat.path;
            return (
              <Link
                key={cat.label}
                to={cat.path}
                className={`transition-colors py-0.5 relative cursor-pointer ${cat.isResale
                  ? "text-rose-500 font-extrabold hover:opacity-80 flex items-center gap-1"
                  : isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "app-text-main hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
              >
                {cat.isResale && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                {cat.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile & Tablet Slide-out Drawer Panel (Portaled to document.body to bypass header backdrop-filter containing block) */}
      {isMobileMenuOpen &&
        createPortal(
          <div
            className="lg:hidden fixed inset-x-0 bottom-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex flex-col justify-start"
            style={{ top: "65px" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsMobileMenuOpen(false);
              }
            }}
          >
            <div className="w-full app-bg-card border-b app-border p-4 sm:p-5 shadow-2xl space-y-4 max-h-[calc(100vh-65px)] overflow-y-auto no-scrollbar animate-in slide-in-from-top-4 duration-300">
              {/* Mobile Search Form */}
              <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Bạn tìm gì hôm nay?"
                  className="w-full app-bg-subnav app-text-main placeholder-zinc-400 text-xs sm:text-sm rounded-xl pl-4 pr-24 py-2.5 border app-border focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <FiSearch className="w-3.5 h-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </form>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Link
                  to="/organizer/create-event"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-blue-500/40 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 font-bold text-xs text-center"
                >
                  <FiPlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tạo sự kiện</span>
                </Link>

                <Link
                  to={PATHS.MY_TICKETS}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl app-bg-subnav app-text-main font-bold text-xs border app-border text-center"
                >
                  <FaTicketAlt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">Vé của tôi</span>
                </Link>

                <Link
                  to={PATHS.LOGIN}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs text-center"
                >
                  <FiUser className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Đăng nhập</span>
                </Link>
              </div>

              {/* Mobile Category Links Grid (2 columns to display ALL items without scrolling) */}
              <div className="pt-3 border-t app-border space-y-2">
                <div className="text-[11px] font-extrabold app-text-muted uppercase tracking-wider">
                  Danh mục sự kiện
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.label}
                      to={cat.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${cat.isResale
                        ? "text-rose-500 font-extrabold bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                        : location.pathname === cat.path
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border-blue-200 dark:border-blue-800/50"
                          : "app-bg-subnav app-text-main hover:bg-slate-200 dark:hover:bg-slate-800 app-border"
                        }`}
                    >
                      <span className="truncate">{cat.label}</span>
                      {cat.isResale && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0 ml-1" />}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* Backdrop dismiss touch area */}
            <div className="flex-1 w-full cursor-pointer" onClick={() => setIsMobileMenuOpen(false)} />
          </div>,
          document.body
        )}
    </header>
  );
};

export default Header;
