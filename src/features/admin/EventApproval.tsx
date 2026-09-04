import React, { useState } from "react";
import {
  FiCheckSquare,
  FiSearch,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiTag,
  FiX,
  FiFileText,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

interface ApprovalEventItem {
  id: string;
  title: string;
  categoryName: string;
  organizerName: string;
  locationName: string;
  address: string;
  datesSummary: string;
  startTime?: string;
  posterImage: string;
  bannerUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  minPrice: number;
  descriptionText: string;
  organizerLogo?: string;
  organizerInfo?: string;
  tickets?: any[];
}

export const EventApproval: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<ApprovalEventItem | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("Hình ảnh poster không đạt tiêu chuẩn bản quyền");
  const [rejectNotes, setRejectNotes] = useState("");

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  const [eventsList, setEventsList] = useState<ApprovalEventItem[]>([
    {
      id: "EV_1001",
      title: "Sơn Tùng M-TP Sky Tour Concert 2026",
      categoryName: "Nhạc sống",
      organizerName: "Halo Entertainment Corp",
      locationName: "Sân vận động Quân Khu 7",
      address: "202 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP.HCM",
      datesSummary: "20:00, 15/10/2026 - 23:30, 15/10/2026",
      posterImage: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
      status: "PENDING",
      submittedAt: "21:15 - 04/09/2026",
      minPrice: 450000,
      descriptionText:
        "Đêm nhạc quy mô lớn hội tụ nghệ sĩ hàng đầu. Yêu cầu kiểm soát vé chặt chẽ chống đầu cơ vé chợ đen.",
      organizerLogo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
      organizerInfo: "Đơn vị tổ chức sự kiện chuyên nghiệp với hơn 8 năm kinh nghiệm.",
      tickets: [
        { name: "Vé VVIP Front Row", price: 2500000, quantity: 100 },
        { name: "Vé VIP Zone A", price: 1200000, quantity: 300 },
        { name: "Vé Phổ Thông GA", price: 450000, quantity: 1000 }
      ]
    },
    {
      id: "EV_1002",
      title: "Saigon Night Run Half Marathon 2026",
      categoryName: "Thể thao",
      organizerName: "Saigon Athletics Club",
      locationName: "Cầu Thủ Thiêm 2 & Đại lộ Mai Chí Thọ",
      address: "Thành phố Thủ Đức, TP. Hồ Chí Minh",
      datesSummary: "04:00, 20/11/2026 - 09:00, 20/11/2026",
      posterImage: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80",
      status: "PENDING",
      submittedAt: "19:40 - 04/09/2026",
      minPrice: 350000,
      descriptionText: "Giải chạy đêm marathon xuyên thành phố chào mừng ngày hội thể thao TP.HCM.",
      organizerLogo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
      organizerInfo: "Câu lạc bộ thể thao chạy điền kinh lớn nhất miền Nam.",
      tickets: [
        { name: "BIB 21KM Half Marathon", price: 650000, quantity: 500 },
        { name: "BIB 10KM Fun Run", price: 350000, quantity: 1500 }
      ]
    },
    {
      id: "EV_1003",
      title: "Kịch Nói Cổ Tích: Đêm Trái Tim Trẻ Thơ",
      categoryName: "Sân khấu & Nghệ thuật",
      organizerName: "Nhà Hát Idecaf TP.HCM",
      locationName: "Nhà Hát Bến Thành",
      address: "6 Mạc Đĩnh Chi, Bến Nghé, Quận 1, TP.HCM",
      datesSummary: "19:30, 05/12/2026 - 21:30, 05/12/2026",
      posterImage: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80",
      status: "PENDING",
      submittedAt: "14:20 - 04/09/2026",
      minPrice: 200000,
      descriptionText: "Vở kịch thiếu nhi nghệ thuật chất lượng cao, gây quỹ từ thiện mua sách cho trẻ em vùng cao.",
      tickets: [
        { name: "Vé Tầng Trệt VIP", price: 350000, quantity: 200 },
        { name: "Vé Lầu Phổ Thông", price: 200000, quantity: 300 }
      ]
    },
    {
      id: "EV_1004",
      title: "Hội Thảo Công Nghệ AI Summit Vietnam 2026",
      categoryName: "Hội thảo & Workshop",
      organizerName: "TechVanguard Vietnam",
      locationName: "Trung tâm Hội nghị Gem Center",
      address: "8 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1, TP.HCM",
      datesSummary: "08:00, 18/09/2026 - 17:30, 18/09/2026",
      posterImage: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
      status: "APPROVED",
      submittedAt: "10:00 - 03/09/2026",
      minPrice: 890000,
      descriptionText: "Hội thảo quốc tế hội tụ hơn 30 diễn giả công nghệ hàng đầu thế giới."
    }
  ]);

  const handleApprove = (id: string) => {
    setEventsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "APPROVED" } : item))
    );
    setSelectedEvent(null);
  };

  const handleRejectSubmit = () => {
    if (!selectedEvent) return;
    setEventsList((prev) =>
      prev.map((item) => (item.id === selectedEvent.id ? { ...item, status: "REJECTED" } : item))
    );
    setShowRejectModal(false);
    setSelectedEvent(null);
  };

  const filteredEvents = eventsList.filter((item) => {
    const matchesTab = activeTab === "ALL" ? true : item.status === activeTab;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2 app-bg-card border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 shadow-xs max-w-md w-full">
          <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên sự kiện hoặc Ban tổ chức..."
            className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-slate-400 font-medium"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex p-1 app-bg-card border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto no-scrollbar">
          {[
            { id: "PENDING", label: "Chờ duyệt", count: 3, color: "text-amber-500" },
            { id: "APPROVED", label: "Đã duyệt", count: null, color: "text-emerald-500" },
            { id: "REJECTED", label: "Từ chối", count: null, color: "text-rose-500" },
            { id: "ALL", label: "Tất cả", count: null, color: "" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
              >
                <span className={isActive ? "text-white" : tab.color}>
                  {tab.label} {tab.count !== null && `(${tab.count})`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Inspection List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
            <FiCheckSquare className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold app-text-main">Không có yêu cầu kiểm duyệt nào</h4>
            <p className="text-xs app-text-muted">Không tìm thấy sự kiện nào trùng khớp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          paginatedEvents.map((ev) => (
            <div
              key={ev.id}
              className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 hover:border-blue-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
            >
              {/* Event Image & Core Information */}
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-800">
                  <img src={ev.posterImage} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ev.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : ev.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                    >
                      {ev.status === "PENDING" ? "Đang chờ duyệt" : ev.status === "APPROVED" ? "Đã phê duyệt" : "Đã từ chối"}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      {ev.categoryName}
                    </span>
                    <span className="text-[11px] app-text-muted">Gửi: {ev.submittedAt}</span>
                  </div>

                  <h3 className="text-sm font-bold app-text-main leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {ev.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs app-text-muted">
                    <span className="flex items-center gap-1">
                      <FiUser className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{ev.organizerName}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{ev.locationName}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(ev)}
                  className="flex-1 md:flex-initial px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-card app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FiEye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Xem hồ sơ</span>
                </button>

                {ev.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvent(ev);
                        setShowRejectModal(true);
                      }}
                      className="px-3 py-1.5 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <FiXCircle className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(ev.id)}
                      className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      <span>Phê duyệt</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {filteredEvents.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span>
            Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedEvents.length}</span> trên tổng số <span className="font-bold text-slate-900 dark:text-slate-100">{filteredEvents.length}</span> sự kiện
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Event Details Drawer/Modal */}
      {selectedEvent && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block uppercase">
                  Mã sự kiện: {selectedEvent.id}
                </span>
                <h3 className="text-base font-bold app-text-main">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Poster & Banner */}
            <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 h-44 bg-slate-900">
              <img src={selectedEvent.bannerUrl || selectedEvent.posterImage} alt="" className="w-full h-full object-cover opacity-80" />
              <div className="absolute bottom-3 left-3 flex items-center gap-3">
                <img src={selectedEvent.posterImage} alt="" className="w-16 h-16 rounded-md object-cover border-2 border-white shadow-md" />
                <div className="text-white drop-shadow-md">
                  <p className="text-xs font-bold">{selectedEvent.organizerName}</p>
                  <p className="text-[10px] opacity-90">{selectedEvent.categoryName}</p>
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Địa điểm tổ chức</span>
                <p className="font-semibold app-text-main flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{selectedEvent.locationName}</span>
                </p>
                <p className="text-[11px] app-text-muted">{selectedEvent.address}</p>
              </div>

              <div className="p-3 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Thời gian diễn ra</span>
                <p className="font-semibold app-text-main flex items-center gap-1.5">
                  <FiCalendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{selectedEvent.datesSummary}</span>
                </p>
              </div>
            </div>

            {/* Tickets */}
            {selectedEvent.tickets && selectedEvent.tickets.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                  <FiTag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Danh sách hạng vé đăng ký</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {selectedEvent.tickets.map((t: any, i: number) => (
                    <div key={i} className="p-2.5 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 text-xs space-y-0.5">
                      <span className="font-bold app-text-main block truncate">{t.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold block">
                        {t.price ? `${t.price.toLocaleString("vi-VN")} đ` : "Miễn phí"}
                      </span>
                      <span className="text-[10px] app-text-muted block">SL: {t.quantity} vé</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                <FiFileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Nội dung mô tả sự kiện</span>
              </h4>
              <div className="p-3 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 text-xs app-text-main whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                {selectedEvent.descriptionText}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-semibold text-xs rounded-md border border-rose-200 dark:border-rose-900 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <FiXCircle className="w-3.5 h-3.5" />
                <span>Từ chối duyệt</span>
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selectedEvent.id)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <FiCheckCircle className="w-3.5 h-3.5" />
                <span>Phê duyệt sự kiện</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-rose-500">
              <FiAlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold app-text-main">Từ chối duyệt sự kiện</h3>
            </div>

            <p className="text-xs app-text-muted leading-relaxed">
              Bạn đang từ chối sự kiện <span className="font-bold app-text-main">"{selectedEvent.title}"</span>. Vui lòng chọn lý do để hệ thống gửi thông báo cho Ban Tổ Chức.
            </p>

            <div className="space-y-2.5">
              <label className="text-xs font-semibold app-text-main block">Lý do chính từ chối</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-md p-2.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
              >
                <option value="Hình ảnh poster/banner không đạt tiêu chuẩn bản quyền" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Hình ảnh poster/banner không đạt tiêu chuẩn bản quyền</option>
                <option value="Thiếu giấy phép tổ chức biểu diễn nghệ thuật/thể thao" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Thiếu giấy phép tổ chức biểu diễn nghệ thuật/thể thao</option>
                <option value="Nội dung mô tả chưa rõ ràng hoặc vi phạm thuần phong mỹ tục" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Nội dung mô tả chưa rõ ràng hoặc vi phạm thuần phong mỹ tục</option>
                <option value="Giá vé hoặc thông tin địa điểm chưa chính xác" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Giá vé hoặc thông tin địa điểm chưa chính xác</option>
                <option value="Khác" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Lý do khác...</option>
              </select>

              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Nhập ghi chú chi tiết hướng dẫn BTC sửa đổi..."
                className="w-full app-bg-subnav app-text-main text-xs rounded-md p-2.5 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 app-bg-subnav app-text-main text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventApproval;
