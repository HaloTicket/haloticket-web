import { useTranslation } from "react-i18next";
import React from "react";
import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import {
  FiCheckSquare,
  FiShield,
  FiTrendingUp,
  FiActivity,
  FiArrowUpRight,
  FiChevronRight,
  FiEye,
  FiRefreshCw,
  FiStar
} from "react-icons/fi";

export const AdminDashboard: React.FC = () => {
  const { t: translate } = useTranslation();
  const [isAiAnalyzing, setIsAiAnalyzing] = React.useState(true);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);

  React.useEffect(() => {
    // simulate AI summary generation
    const timer = setTimeout(() => {
      setAiSummary("Hệ thống phát hiện **3 sự kiện** có dấu hiệu rủi ro cao cần duyệt gấp. \n\nGiá trần bán lại ở mức **+20%** đang hoạt động ổn định, ngăn chặn 125 giao dịch phe vé.\n\nTất cả **8 microservices** đều đang hoạt động bình thường (99.9% uptime).");
      setIsAiAnalyzing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const statCards = [
    {
      id: "pending-events",
      title: "Sự kiện chờ duyệt",
      value: "3",
      change: "+2 trong ngày",
      changeType: "neutral",
      icon: <FiCheckSquare className="w-5 h-5 text-amber-500" />,
      bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900",
      link: PATHS.ADMIN_EVENTS_APPROVAL,
      badgeText: "Cần xử lý ngay"
    },
    {
      id: "pending-ekyc",
      title: "Hồ sơ eKYC chờ xác thực",
      value: "5",
      change: "Thời gian chờ avg: 12 phút",
      changeType: "positive",
      icon: <FiShield className="w-5 h-5 text-blue-500" />,
      bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900",
      link: PATHS.ADMIN_EKYC_APPROVAL,
      badgeText: "Hàng đợi BTC"
    },
    {
      id: "resale-cap",
      title: "Giá trần Bán vé lại (Resale)",
      value: "Max +20%",
      change: "125 vé đang giao dịch",
      changeType: "positive",
      icon: <FiTrendingUp className="w-5 h-5 text-emerald-500" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900",
      link: PATHS.ADMIN_RESALE_PRICE_CAP,
      badgeText: "Đang hoạt động"
    },
    {
      id: "system-health",
      title: "Sức khỏe Microservices",
      value: "99.9%",
      change: "8/8 Dịch vụ UP (Clean)",
      changeType: "positive",
      icon: <FiActivity className="w-5 h-5 text-indigo-500" />,
      bg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900",
      link: PATHS.ADMIN_SYSTEM_HEALTH,
      badgeText: "Ổn định"
    }
  ];

  const recentPendingEvents = [
    {
      id: "EV_1001",
      title: "Sơn Tùng M-TP Sky Tour 2026",
      organizer: "Halo Entertainment Corp",
      category: "Nhạc sống",
      submittedAt: "21:15, 04/09/2026",
      status: "PENDING",
      poster: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80"
    },
    {
      id: "EV_1002",
      title: "Giải Chạy Đêm Saigon Night Run 2026",
      organizer: "Saigon Athletics Club",
      category: "Thể thao",
      submittedAt: "19:40, 04/09/2026",
      status: "PENDING",
      poster: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80"
    },
    {
      id: "EV_1003",
      title: "Kịch Nói: Đêm Cổ Tích Idecaf 2026",
      organizer: "Nhà Hát Idecaf TP.HCM",
      category: "Sân khấu & Nghệ thuật",
      submittedAt: "17:10, 04/09/2026",
      status: "PENDING",
      poster: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80"
    }
  ];

  const recentActivityLogs = [
    {
      id: "log-1",
      user: "Trần Long Vũ (Admin)",
      action: "Đã duyệt giá trần 120% cho thị trường vé Resale",
      time: "25 phút trước",
      type: "success"
    },
    {
      id: "log-2",
      user: "Hệ thống Bán vé",
      action: "Tự động giữ 1 vé Resale #TK-8812 do nghi vấn đầu cơ",
      time: "45 phút trước",
      type: "warning"
    },
    {
      id: "log-3",
      user: "Nguyễn Văn B (Admin)",
      action: "Phê duyệt eKYC cho Ban tổ chức Saigon Events",
      time: "2 giờ trước",
      type: "info"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-blue-500/20">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
            <FiActivity className="w-3.5 h-3.5" />
            <span>{translate("Hệ thống Quản trị HaloTicket Admin v2.5")}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">
            {translate("Chào mừng trở lại, Trần Long Vũ! 👋")} </h2>
          <p className="text-xs md:text-sm text-blue-100/80 leading-relaxed">
            {translate("Hệ thống hiện có")} <span className="font-bold text-amber-300">{translate("3 sự kiện chờ duyệt")}</span> {translate("và")}{" "}
            <span className="font-bold text-blue-300">{translate("5 hồ sơ eKYC")}</span> {translate("đang chờ đối soát.")} </p>
        </div>

        {/* Action button */}
        <div className="z-10 flex items-center gap-3 shrink-0">
          <Link
            to={PATHS.ADMIN_EVENTS_APPROVAL}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <FiCheckSquare className="w-4 h-4" />
            <span>{translate("Kiểm duyệt Sự kiện ngay")}</span>
          </Link>
        </div>

        {/* Decorative background circle pattern */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* AI Executive Summary Banner */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl flex flex-col md:flex-row items-start gap-5 shadow-lg">
        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
          <FiStar className="w-7 h-7" />
        </div>
        <div className="flex-1 space-y-3 w-full">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-blue-800 dark:text-blue-300 flex items-center gap-2 tracking-tight">
              AI Executive Summary
            </h4>
            <button
              type="button"
              onClick={() => { setIsAiAnalyzing(true); setTimeout(() => setIsAiAnalyzing(false), 2000); }}
              className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-600 rounded-lg transition-colors cursor-pointer"
              title="Làm mới báo cáo"
            >
              <FiRefreshCw className={`w-5 h-5 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {isAiAnalyzing ? (
            <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 py-4">
              <FiRefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-medium">Đang tổng hợp báo cáo hệ thống...</span>
            </div>
          ) : (
            <>
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
                {aiSummary?.split("\n\n").map((line, i) => (
                  <p key={i}>
                    {line.split("**").map((part, j) => 
                      j % 2 === 1 ? <strong key={j} className="text-blue-700 dark:text-blue-400 font-extrabold text-[15px]">{part}</strong> : part
                    )}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-blue-200/50 dark:border-blue-800/30">
                <Link to={PATHS.ADMIN_EVENTS_APPROVAL} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
                  <FiCheckSquare className="w-4 h-4" /> Duyệt Sự kiện ngay
                </Link>
                <Link to={PATHS.ADMIN_RESALE_PRICE_CAP} className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                  <FiTrendingUp className="w-4 h-4" /> Cấu hình Giá trần
                </Link>
                <Link to={PATHS.ADMIN_SYSTEM_HEALTH} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                  <FiActivity className="w-4 h-4" /> Giám sát Hệ thống
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.id}
            to={card.link}
            className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-blue-500 transition-all shadow-xs space-y-3 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-md border ${card.bg} group-hover:scale-105 transition-transform`}>
                {card.icon}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {translate(card.badgeText)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{translate(card.title)}</span>
              <div className="text-xl font-extrabold app-text-main tracking-tight flex items-baseline gap-2">
                <span>{translate(card.value)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{translate(card.change)}</span>
              <FiArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Pending Events Queue & System Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Pending Events Queue */}
        <div className="lg:col-span-8 space-y-6">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
                  <FiCheckSquare className="w-4 h-4 text-amber-500" />
                  <span>{translate("Sự kiện đang chờ phê duyệt (")}{recentPendingEvents.length})</span>
                </h3>
                <p className="text-xs app-text-muted mt-0.5">{translate("Các yêu cầu tạo sự kiện mới gửi từ Ban Tổ Chức")}</p>
              </div>

              <Link
                to={PATHS.ADMIN_EVENTS_APPROVAL}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>{translate("Xem tất cả")}</span>
                <FiChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Pending List */}
            <div className="space-y-3">
              {recentPendingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={event.poster}
                      alt={translate(event.title)}
                      className="w-14 h-14 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                          {translate("Chờ duyệt")} </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                          {translate(event.category)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold app-text-main truncate">{translate(event.title)}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{translate("BTC:")} {translate(event.organizer)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-200 dark:border-slate-800 pt-2 sm:pt-0">
                    <Link
                      to={PATHS.ADMIN_EVENTS_APPROVAL}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                      <span>{translate("Xem & Duyệt")}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: System Logs & Quick Admin Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Action Shortcuts */}
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              {translate("Tác vụ nhanh Admin")} </h3>

            <div className="space-y-2">
              <Link
                to={PATHS.ADMIN_EKYC_APPROVAL}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiShield className="w-4 h-4 text-blue-500" />
                  <span>{translate("Duyệt hồ sơ eKYC (5)")}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={PATHS.ADMIN_RESALE_PRICE_CAP}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiTrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>{translate("Điều chỉnh Giá trần Vé Resale")}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={PATHS.ADMIN_SYSTEM_HEALTH}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiActivity className="w-4 h-4 text-indigo-500" />
                  <span>{translate("Kiểm tra Microservices")}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Activity Log Feed */}
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              {translate("Nhật ký quản trị gần đây")} </h3>

            <div className="space-y-2">
              {recentActivityLogs.map((log) => (
                <div key={log.id} className="text-xs space-y-1 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between font-bold app-text-main">
                    <span>{translate(log.user)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{translate(log.time)}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-snug">{translate(log.action)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
