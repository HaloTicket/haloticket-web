import React, { useState } from "react";
import {
  FiSearch,
  FiPlus,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiEdit3,
  FiInfo,
  FiTag
} from "react-icons/fi";
import { CreateVoucherModal } from "./components/CreateVoucherModal";
import { TablePagination } from "@/components/common/TablePagination";
import type { VoucherItem } from "@/types";

const INITIAL_VOUCHERS: VoucherItem[] = [
  {
    id: "v-1",
    title: "Test bug",
    code: "123ABC56",
    type: "PERCENTAGE",
    value: 100,
    startDate: "02/06/2025 00:00",
    endDate: "31/07/2025 23:00",
    isActive: true,
  },
  {
    id: "v-2",
    title: "Khuyến mãi Early Bird 2026",
    code: "EARLY2026",
    type: "PERCENTAGE",
    value: 15,
    startDate: "01/08/2026 00:00",
    endDate: "30/09/2026 23:59",
    isActive: true,
  },
  {
    id: "v-3",
    title: "Voucher Đêm Nhạc VIP",
    code: "VIP50K",
    type: "FIXED_AMOUNT",
    value: 50000,
    startDate: "10/08/2026 00:00",
    endDate: "15/10/2026 23:59",
    isActive: false,
  },
];

export const EventVouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<VoucherItem[]>(INITIAL_VOUCHERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredVouchers = vouchers.filter(
    (v) =>
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredVouchers.length / pageSize));
  const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = (id: string) => {
    setVouchers(
      vouchers.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa voucher này?")) {
      setVouchers(vouchers.filter((v) => v.id !== id));
    }
  };

  const handleCreateSave = (newVoucher: any) => {
    setVouchers([newVoucher, ...vouchers]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search & Counter tag */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs flex-1">
            <div className="flex items-center gap-2 flex-1 pl-3">
              <FiSearch className="w-4 h-4 app-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm theo tên chương trình và mã voucher"
                className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <FiSearch className="w-3.5 h-3.5" />
              <span>Tìm kiếm</span>
            </button>
          </div>

          <div className="px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-extrabold app-text-main flex items-center gap-1 shrink-0 shadow-xs">
            <span>{vouchers.length} / 5000</span>
            <FiInfo className="w-3.5 h-3.5 app-text-muted" />
          </div>
        </div>

        {/* Create Voucher CTA Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <FiPlus className="w-4 h-4 stroke-[3]" />
          <span>Tạo voucher</span>
        </button>
      </div>

      {/* Voucher Table with NO row borders */}
      <div className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b app-border bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold app-text-muted uppercase tracking-wider">
                <th className="py-3.5 px-6 rounded-l-xl">Tên chương trình khuyến mãi</th>
                <th className="py-3.5 px-4">Mã voucher</th>
                <th className="py-3.5 px-4 text-center">Mức giảm</th>
                <th className="py-3.5 px-6 text-center">Thời gian áp dụng</th>
                <th className="py-3.5 px-4 text-center">Trạng thái hoạt động</th>
                <th className="py-3.5 px-6 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedVouchers.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl"
                >
                  <td className="py-4 px-6 font-semibold rounded-l-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm font-mono">+</span>
                      <span>{v.title}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400">
                    {v.code}
                  </td>

                  <td className="py-4 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                    {v.type === "PERCENTAGE" ? `${v.value} %` : `${v.value.toLocaleString()} đ`}
                  </td>

                  <td className="py-4 px-6 text-center space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Đang diễn ra
                    </span>
                    <div className="text-[11px] app-text-muted font-medium">
                      {v.startDate} - {v.endDate}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(v.id)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer inline-block align-middle ${
                        v.isActive ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                          v.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>

                  <td className="py-4 px-6 text-right rounded-r-xl">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(v.id, v.code)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                        title="Sao chép mã"
                      >
                        {copiedId === v.id ? <FiCheck className="w-3.5 h-3.5 text-blue-600" /> : <FiCopy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                        title="Chỉnh sửa voucher"
                      >
                        <FiEdit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Xóa voucher"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVouchers.length === 0 ? (
          <div className="p-12 text-center">
            <FiTag className="w-10 h-10 app-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold app-text-muted">Không tìm thấy voucher phù hợp</p>
          </div>
        ) : (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredVouchers.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>

      {/* Create Voucher Drawer / Modal */}
      <CreateVoucherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateSave}
      />
    </div>
  );
};

export default EventVouchers;
