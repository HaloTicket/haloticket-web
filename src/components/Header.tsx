import { useTranslation } from "react-i18next";
import { t as translate, i18n, setLanguage } from "@/i18n";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/hooks/useTheme";
import SearchOverlayModal from "./SearchOverlayModal";
import { addSearchHistory } from "@/utils/searchHistory";
import { eventApi } from "@/services/eventApi";
import { getCachedUserProfile, userApi, type UserProfile } from "@/services/userApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import type { NotificationItem } from "@/types";
import { VietnamFlag, UKFlag } from "./common/FlagIcons";
import { LoginRequiredModal } from "./common/LoginRequiredModal";
import {
  FiSearch,
  FiPlusCircle,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiChevronDown,
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

export const Header: React.FC = () => {
  useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    return location.pathname === "/search" && q ? q : "";
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const lang = i18n.resolvedLanguage;
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    getKeycloakSession().isAuthenticated()
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    getCachedUserProfile()
  );

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const currentNavKey = location.pathname + location.search;
  const [prevNavKey, setPrevNavKey] = useState(currentNavKey);

  // Sync state during render when route changes without cascading effect renders
  if (prevNavKey !== currentNavKey) {
    setPrevNavKey(currentNavKey);
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    setSearchQuery(location.pathname === "/search" && q ? q : "");
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setIsAccountOpen(false);
    setIsLangOpen(false);
    setShowLoginModal(false);
  }

  // Check auth and user info on mount & sync across storage/profile events
  useEffect(() => {
    const checkAuth = () => {
      const authed = getKeycloakSession().isAuthenticated();
      setIsAuthenticated(authed);
      if (authed) {
        setUserProfile(getCachedUserProfile());
        userApi.getProfile().then((data) => {
          if (data) setUserProfile(data);
        }).catch(() => { });
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

  // Close dropdowns on click outside or escape key
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
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLangOpen(false);
        setIsAccountOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await getKeycloakSession().logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    setIsAccountOpen(false);
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new Event("user-updated"));
    window.dispatchEvent(new Event("auth-changed"));
    navigate(PATHS.HOME, { replace: true });
  };

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

  const userInitial = (
    userProfile?.fullName?.[0] ||
    userProfile?.email?.[0] ||
    "M"
  ).toUpperCase();

  const categories = [
    { label: "Nhạc sống", path: "/category/music" },
    { label: "Sân khấu & Nghệ thuật", path: "/category/stage" },
    { label: "Thể Thao", path: "/category/sports" },
    { label: "Hội thảo & Workshop", path: "/category/workshop" },
    { label: "Tham quan & Trải nghiệm", path: "/category/experience" },
    { label: "Khác", path: "/category/others" },
    { label: "Vé bán lại", path: "/resale-ticket", isResale: true },
    { label: "Blog", path: "/blog" },
  ];

  const isBookingFlow = location.pathname.includes("select-ticket") || location.pathname.includes("checkout");

  return (
    <header className={`${isBookingFlow ? 'relative z-30' : 'sticky top-0 z-50'} app-bg-header border-b app-border transition-colors duration-300`}>
      {/* Top Header Bar */}
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
        <div
          ref={searchContainerRef}
          className="hidden lg:flex items-center grow max-w-xl mx-4 relative"
        >
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
              placeholder={translate("Bạn tìm gì hôm nay?")}
              className="w-full app-bg-card app-text-main placeholder-zinc-400 text-sm rounded-xl pl-4 pr-24 py-2.5 border app-border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FiSearch className="w-3.5 h-3.5" />
              <span>{translate("Tìm kiếm")}</span>
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

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Button Create Event (Desktop) */}
          <Link
            to="/organizer/create-event"
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                navigate(PATHS.LOGIN);
              }
            }}
            className="group hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer"
          >
            <FiPlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500 shrink-0" />
            <span>{translate("Tạo sự kiện")}</span>
          </Link>

          {/* My Tickets (Desktop) */}
          <Link
            to={PATHS.MY_TICKETS}
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                setShowLoginModal(true);
              }
            }}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium app-text-main hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LuTicket className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{translate("Vé của tôi")}</span>
          </Link>

          <div className="h-6 w-px app-border hidden lg:block" />

          {isAuthenticated && userProfile?.keycloakId && <GiftNotificationBell userId={userProfile.keycloakId} />}

          {/* Auth Dropdown (Ảnh 1) */}
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
                  {userProfile?.avatarUrl?.startsWith("https://") && failedAvatar !== userProfile.avatarUrl ? (
                    <img src={userProfile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" onError={() => setFailedAvatar(userProfile.avatarUrl)} />
                  ) : userInitial}
                </span>
                <span>{translate("Tài khoản")}</span>
                <FiChevronDown
                  className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${isAccountOpen ? "rotate-180" : "group-hover:rotate-180"
                    }`}
                />
              </button>

              {/* Account Hover Dropdown Menu (Ảnh 1) */}
              <div
                className={`absolute right-0 top-full pt-2 w-56 transition-all duration-200 z-50 origin-top-right ${isAccountOpen
                    ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
                    : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
                  }`}
                role="menu"
              >
                <div className="app-bg-card border app-border rounded-2xl p-2 shadow-2xl space-y-1 app-text-main animate-in zoom-in-95">
                  {/* Customer section */}
                  <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                    {translate("Cá nhân")}</div>

                  <Link
                    to={PATHS.MY_TICKETS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuTicket className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{translate("Vé của tôi")}</span>
                  </Link>

                  <Link
                    to={PATHS.PROFILE}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuUser className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{translate("Thông tin cá nhân")}</span>
                  </Link>

                  <Link
                    to="/profile?tab=membership"
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                  >
                    <LuGem className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{translate("Thẻ thành viên")}</span>
                  </Link>

                  <div className="my-1 border-t app-border" />

                  {/* Organizer section */}
                  <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                    {translate("Ban Tổ Chức")}</div>

                  <Link
                    to={PATHS.MY_EVENTS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuCalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{translate("Quản lý sự kiện")}</span>
                  </Link>

                  <Link
                    to={PATHS.REPORTS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuChartColumn className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{translate("Báo cáo doanh thu")}</span>
                  </Link>

                  <Link
                    to={PATHS.TERMS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuBuilding2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{translate("Hồ sơ Ban tổ chức")}</span>
                  </Link>

                  <div className="my-1 border-t app-border" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                  >
                    <LuLogOut className="w-4 h-4 shrink-0" />
                    <span>{translate("Đăng xuất")}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to={PATHS.LOGIN}
              className="hidden sm:flex text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer app-text-main"
            >
              {translate("Đăng nhập")}<span className="app-text-muted font-normal mx-1">|</span> {translate("Đăng ký")}</Link>
          )}

          {/* Language Flag Dropdown (Ảnh 2) */}
          <div ref={langDropdownRef} className="relative group py-1">
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="flex cursor-pointer items-center gap-1.5 px-1.5 py-1.5 text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              title={translate("Ngôn ngữ")}
              aria-label={translate("Chọn ngôn ngữ")}
            >
              {lang === "vi" ? (
                <VietnamFlag className="w-5 h-5" />
              ) : (
                <UKFlag className="w-5 h-5" />
              )}
              <FiChevronDown
                className={`w-3 h-3 text-muted-foreground app-text-muted transition-transform duration-200 ${isLangOpen ? "rotate-180" : "group-hover:rotate-180"
                  }`}
              />
            </button>

            {/* Flag Hover Menu (Ảnh 2) */}
            <div
              className={`absolute right-0 top-full pt-2 w-40 transition-all duration-200 z-50 origin-top-right ${isLangOpen
                  ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
                  : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
                }`}
            >
              <div className="app-bg-card border app-border rounded-2xl p-1.5 shadow-2xl space-y-1 animate-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    void setLanguage("vi");
                    setIsLangOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left cursor-pointer ${lang === "vi"
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
                    void setLanguage("en");
                    setIsLangOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left cursor-pointer ${lang === "en"
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
            aria-label={translate("Tắt/Mở Chế độ Tối")}
            title={isDark ? translate("Chuyển sang Chế độ Sáng") : translate("Chuyển sang Chế độ Tối")}
          >
            {isDark ? (
              <FiSun className="w-5 h-5 text-amber-400 transform hover:rotate-90 transition-transform duration-500" />
            ) : (
              <FiMoon className="w-5 h-5 app-text-main hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-xl app-bg-card app-text-main border app-border hover:border-blue-500/50 transition-all cursor-pointer shadow-xs"
            aria-label={translate("Mở menu")}
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
                className={`relative cursor-pointer py-0.5 transition-colors flex items-center gap-1.5 ${
                  cat.isResale 
                    ? "text-rose-600 font-extrabold px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 uppercase" 
                    : isActive
                      ? "font-bold text-blue-600 after:absolute after:-bottom-2.5 after:left-0 after:h-0.5 after:w-full after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400"
                      : "app-text-main hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                {cat.isResale && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                {translate(cat.label)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
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
                  placeholder={translate("Bạn tìm gì hôm nay?")}
                  className="w-full app-bg-subnav app-text-main placeholder-zinc-400 text-xs sm:text-sm rounded-xl pl-4 pr-24 py-2.5 border app-border focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <FiSearch className="w-3.5 h-3.5" />
                  <span>{translate("Tìm kiếm")}</span>
                </button>
              </form>

              {/* Mobile Action Buttons */}
              <div className="space-y-2">
                <Link
                  to="/organizer/create-event"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl bg-blue-600 text-white shadow-sm"
                >
                  <FiPlusCircle className="h-4 w-4" /> {translate("Tạo sự kiện mới")}</Link>

                {isAuthenticated ? (
                  <div className="space-y-1 pt-2 border-t app-border">
                    <div className="px-2 py-1 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                      {translate("Tài khoản của bạn (")}{userProfile?.fullName || translate("Khách hàng")})
                    </div>
                    <Link
                      to={PATHS.MY_TICKETS}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors app-text-main"
                    >
                      <LuTicket className="h-4 w-4 text-emerald-600" /> {translate("Vé của tôi")}</Link>
                    <Link
                      to={PATHS.PROFILE}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors app-text-main"
                    >
                      <LuUser className="h-4 w-4 text-blue-500" /> {translate("Thông tin cá nhân")}</Link>
                    <Link
                      to="/profile?tab=membership"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors app-text-main"
                    >
                      <LuGem className="h-4 w-4 text-amber-500" /> {translate("Thẻ thành viên")}</Link>
                    <Link
                      to={PATHS.MY_EVENTS}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors app-text-main"
                    >
                      <LuCalendarDays className="h-4 w-4 text-blue-500" /> {translate("Quản lý sự kiện")}</Link>
                    <Link
                      to={PATHS.REPORTS}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors app-text-main"
                    >
                      <LuChartColumn className="h-4 w-4 text-indigo-500" /> {translate("Báo cáo doanh thu")}</Link>
                    <Link
                      to={PATHS.TERMS}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors app-text-main"
                    >
                      <LuBuilding2 className="h-4 w-4 text-purple-500" /> {translate("Hồ sơ Ban tổ chức")}</Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 text-xs font-semibold py-2 px-2 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors text-left w-full cursor-pointer mt-1"
                    >
                      <LuLogOut className="h-4 w-4" /> {translate("Đăng xuất")}</button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t app-border">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setShowLoginModal(true);
                      }}
                      className="flex items-center gap-3 text-xs font-semibold py-2.5 px-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors app-text-main w-full border app-border cursor-pointer group"
                    >
                      <LuTicket className="h-4 w-4 text-emerald-600 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 shrink-0" />
                      <span>{translate("Vé của tôi")}</span>
                    </button>
                    <Link
                      to={PATHS.LOGIN}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl bg-blue-600 text-white shadow-sm"
                    >
                      <LuUser className="h-4 w-4" /> {translate("Đăng nhập | Đăng ký")}
                    </Link>
                  </div>
                )}
              </div>

              {/* Language Selector in Mobile Drawer */}
              <div className="pt-3 border-t app-border">
                <div className="text-[11px] font-extrabold app-text-muted uppercase tracking-wider mb-2">
                  {translate("Ngôn ngữ")}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void setLanguage("vi");
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${lang === "vi"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-400"
                        : "app-bg-subnav app-text-main app-border"
                      }`}
                  >
                    <VietnamFlag className="w-4 h-4" />
                    <span>Tiếng Việt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void setLanguage("en");
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${lang === "en"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-400"
                        : "app-bg-subnav app-text-main app-border"
                      }`}
                  >
                    <UKFlag className="w-4 h-4" />
                    <span>English</span>
                  </button>
                </div>
              </div>

              {/* Mobile Category Links Grid */}
              <div className="pt-3 border-t app-border space-y-2">
                <div className="text-[11px] font-extrabold app-text-muted uppercase tracking-wider">
                  {translate("Danh mục sự kiện")}</div>
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
                      <span className="truncate">{translate(cat.label)}</span>
                      {cat.isResale && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0 ml-1" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* Backdrop dismiss touch area */}
            <div
              className="flex-1 w-full cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>,
          document.body
        )}

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectUrl={PATHS.MY_TICKETS}
      />
    </header>
  );
};

export default Header;

function GiftNotificationBell({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationSocket(userId);
  const onClick = (item: NotificationItem) => {
    void markAsRead(item.id);
    if (item.type === "GIFT_INVITATION") {
      const sagaId = item.message.match(/Mã lời mời: ([a-f0-9-]{36})/i)?.[1];
      if (sagaId) navigate(`${PATHS.GIFT_ACCEPT}?sagaId=${encodeURIComponent(sagaId)}`);
    }
  };
  return <NotificationDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllAsRead={markAllAsRead} onNotificationClick={onClick} viewAllLink={PATHS.MY_TICKETS} titleText="Thông báo vé" />;
}
