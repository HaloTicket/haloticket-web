import React, { useState } from "react";
import {
  FiShield,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiX,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

interface EkycItem {
  id: string;
  userId: string;
  fullName: string;
  idNumber: string;
  dob: string;
  gender: string;
  address: string;
  issueDate: string;
  organizerName: string;
  taxCode: string;
  frontCardImg: string;
  backCardImg: string;
  selfieImg: string;
  matchScore: number;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
}

export const EkycApproval: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEkyc, setSelectedEkyc] = useState<EkycItem | null>(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [ekycList, setEkycList] = useState<EkycItem[]>([
    {
      id: "EKYC_901",
      userId: "USR_1001",
      fullName: "Trần Long Vũ",
      idNumber: "079201008899",
      dob: "15/08/1998",
      gender: "Nam",
      address: "240 Đường 3/2, Phường Bến Nghé, Quận 1, TP.HCM",
      issueDate: "10/05/2021",
      organizerName: "Halo Ticket Entertainment Ltd",
      taxCode: "0314988201",
      frontCardImg: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
      backCardImg: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80",
      selfieImg: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
      matchScore: 98.8,
      status: "PENDING",
      submittedAt: "20:30 - 04/09/2026"
    },
    {
      id: "EKYC_902",
      userId: "USR_1002",
      fullName: "Nguyễn Thị Ánh Tuyết",
      idNumber: "012300099887",
      dob: "22/11/1995",
      gender: "Nữ",
      address: "12 Lý Thường Kiệt, Phường 7, Quận 10, TP.HCM",
      issueDate: "14/02/2022",
      organizerName: "Saigon Athletics Club",
      taxCode: "0388910022",
      frontCardImg: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
      backCardImg: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80",
      selfieImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
      matchScore: 96.2,
      status: "PENDING",
      submittedAt: "18:15 - 04/09/2026"
    },
    {
      id: "EKYC_903",
      userId: "USR_1003",
      fullName: "Phạm Minh Hoàng",
      idNumber: "034200881122",
      dob: "01/01/1990",
      gender: "Nam",
      address: "Hà Nội",
      issueDate: "05/01/2020",
      organizerName: "Hanoi Concert Media",
      taxCode: "0109928172",
      frontCardImg: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
      backCardImg: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80",
      selfieImg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
      matchScore: 99.1,
      status: "VERIFIED",
      submittedAt: "10:00 - 01/09/2026"
    }
  ]);

  const handleVerify = (id: string) => {
    setEkycList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "VERIFIED" } : item))
    );
    setSelectedEkyc(null);
  };

  const handleReject = (id: string) => {
    setEkycList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "REJECTED" } : item))
    );
    setSelectedEkyc(null);
  };

  const filteredEkyc = ekycList.filter((item) => {
    const matchesTab = item.status === activeTab;
    const matchesQuery =
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.idNumber.includes(searchQuery) ||
      item.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const totalPages = Math.ceil(filteredEkyc.length / pageSize) || 1;
  const paginatedEkyc = filteredEkyc.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Search & Tab Filter */}
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
            placeholder="Tìm theo họ tên, số CCCD hoặc Ban tổ chức..."
            className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-slate-400 font-medium"
          />
        </div>

        {/* Tab Filters */}
        <div className="inline-flex p-1 app-bg-card border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto no-scrollbar">
          {[
            { id: "PENDING", label: "Chờ xác minh", count: 2 },
            { id: "VERIFIED", label: "Đã duyệt", count: null },
            { id: "REJECTED", label: "Từ chối", count: null }
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
                {tab.label} {tab.count !== null && `(${tab.count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of eKYC Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEkyc.length === 0 ? (
          <div className="col-span-full app-bg-card border border-slate-200 dark:border-slate-800 rounded-md p-10 text-center space-y-2">
            <FiShield className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold app-text-main">Không có dữ liệu eKYC nào</h4>
            <p className="text-xs app-text-muted">Không tìm thấy hồ sơ nào khớp với tìm kiếm.</p>
          </div>
        ) : (
          paginatedEkyc.map((item) => (
            <div
              key={item.id}
              className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3 hover:border-blue-500/50 transition-all flex flex-col justify-between"
            >
              {/* Applicant Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-mono font-semibold text-slate-400">#{item.id}</span>
                </div>
                <span className="text-[10px] text-slate-400">{item.submittedAt}</span>
              </div>

              {/* User Avatar Selfie & Info */}
              <div className="flex items-center gap-3">
                <img
                  src={item.selfieImg}
                  alt={item.fullName}
                  className="w-12 h-12 rounded-md object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="text-xs font-bold app-text-main truncate">{item.fullName}</h4>
                  <p className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 truncate">
                    CCCD: {item.idNumber}
                  </p>
                  <p className="text-[11px] app-text-muted truncate">BTC: {item.organizerName}</p>
                </div>
              </div>

              {/* Match Score Indicator */}
              <div className="p-2.5 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Độ khớp AI:</span>
                <span className="font-bold text-emerald-500">{item.matchScore}%</span>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEkyc(item)}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FiEye className="w-3.5 h-3.5" />
                  <span>Đối soát chi tiết</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {filteredEkyc.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span>
            Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedEkyc.length}</span> trên tổng số <span className="font-bold text-slate-900 dark:text-slate-100">{filteredEkyc.length}</span> hồ sơ
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

      {/* Side-by-Side EKYC Modal Preview */}
      {selectedEkyc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-3xl w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                  Đối soát eKYC #{selectedEkyc.id}
                </span>
                <h3 className="text-base font-bold app-text-main">
                  Xác minh danh tính - {selectedEkyc.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEkyc(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Side-by-side Comparative Image Viewer */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold app-text-main">Hình ảnh đối chiếu (CCCD vs Chân dung Selfie)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 text-center">
                  <span className="text-[11px] font-medium app-text-muted">Mặt trước CCCD</span>
                  <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <img src={selectedEkyc.frontCardImg} alt="Front ID" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <span className="text-[11px] font-medium app-text-muted">Mặt sau CCCD</span>
                  <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <img src={selectedEkyc.backCardImg} alt="Back ID" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <span className="text-[11px] font-semibold text-emerald-500">Chân dung ({selectedEkyc.matchScore}%)</span>
                  <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-900 border border-emerald-500/50 relative">
                    <img src={selectedEkyc.selfieImg} alt="Selfie" className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold">
                      MATCH
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Comparison Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h5 className="font-bold text-blue-600 dark:text-blue-400">Thông tin Giấy tờ Cá nhân</h5>
                <div className="space-y-1">
                  <p className="flex justify-between"><span className="app-text-muted">Họ và tên:</span> <span className="font-bold app-text-main">{selectedEkyc.fullName}</span></p>
                  <p className="flex justify-between"><span className="app-text-muted">Số CCCD:</span> <span className="font-mono font-semibold text-blue-600">{selectedEkyc.idNumber}</span></p>
                  <p className="flex justify-between"><span className="app-text-muted">Ngày sinh:</span> <span className="font-medium app-text-main">{selectedEkyc.dob}</span></p>
                  <p className="flex justify-between"><span className="app-text-muted">Giới tính:</span> <span className="font-medium app-text-main">{selectedEkyc.gender}</span></p>
                </div>
              </div>

              <div className="p-3 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h5 className="font-bold text-blue-600 dark:text-blue-400">Thông tin Doanh nghiệp / BTC</h5>
                <div className="space-y-1">
                  <p className="flex justify-between"><span className="app-text-muted">Tên Ban Tổ Chức:</span> <span className="font-bold app-text-main">{selectedEkyc.organizerName}</span></p>
                  <p className="flex justify-between"><span className="app-text-muted">Mã số thuế:</span> <span className="font-mono font-semibold text-blue-600">{selectedEkyc.taxCode}</span></p>
                  <p className="flex justify-between"><span className="app-text-muted">Thời gian nộp:</span> <span className="font-medium app-text-main">{selectedEkyc.submittedAt}</span></p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleReject(selectedEkyc.id)}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-semibold text-xs rounded-md border border-rose-200 dark:border-rose-900 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <FiXCircle className="w-3.5 h-3.5" />
                <span>Từ chối hồ sơ</span>
              </button>

              <button
                type="button"
                onClick={() => handleVerify(selectedEkyc.id)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <FiCheckCircle className="w-3.5 h-3.5" />
                <span>Phê duyệt eKYC</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EkycApproval;
