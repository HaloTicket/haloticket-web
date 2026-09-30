import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit,
  FiTrash2,
  FiShield,
  FiUsers,
  FiCalendar
} from "react-icons/fi";
import type { SystemVenue } from "@/utils/venueUtils";

interface VenueTableProps {
  venues: SystemVenue[];
  busyId: string | null;
  onToggleVerification: (venue: SystemVenue) => void;
  onEdit: (venue: SystemVenue) => void;
  onDelete: (venue: SystemVenue) => void;
}

export const VenueTable: React.FC<VenueTableProps> = ({
  venues,
  busyId,
  onToggleVerification,
  onEdit,
  onDelete
}) => {
  const { t: translate } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="app-bg-subnav border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold app-text-muted uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4">{translate("Tên địa điểm")}</th>
            <th className="py-3 px-4">{translate("Địa chỉ chi tiết")}</th>
            <th className="py-3 px-4">{translate("Sức chứa")}</th>
            <th className="py-3 px-4">{translate("Số sự kiện")}</th>
            <th className="py-3 px-4">{translate("Trạng thái xác minh")}</th>
            <th className="py-3 px-4 text-right">{translate("Thao tác Admin")}</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 app-text-main font-medium">
          {venues.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-10 text-center app-text-muted">
                <FiMapPin className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="font-semibold text-xs">{translate("Không tìm thấy địa điểm nào phù hợp.")}</p>
              </td>
            </tr>
          ) : (
            venues.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {/* Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                      <FiMapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs app-text-main">{v.name}</p>
                      <p className="text-[10px] app-text-muted">ID: {v.id}</p>
                    </div>
                  </div>
                </td>

                {/* Address */}
                <td className="py-3 px-4">
                  <p className="font-semibold text-xs">{v.address}</p>
                  <p className="text-[11px] app-text-muted">
                    {v.ward ? `${v.ward}, ` : ""}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{v.city}</span>
                  </p>
                </td>

                {/* Capacity */}
                <td className="py-3 px-4 font-bold">
                  <span className="flex items-center gap-1">
                    <FiUsers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{v.capacity.toLocaleString("vi-VN")} {translate("chỗ")}</span>
                  </span>
                </td>

                {/* Events count */}
                <td className="py-3 px-4 font-bold">
                  <span className="flex items-center gap-1">
                    <FiCalendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>{("eventsHostedKnown" in v && v.eventsHostedKnown === false) ? translate("Chưa có dữ liệu") : `${v.eventsHosted} ${translate("sự kiện")}`}</span>
                  </span>
                </td>

                {/* Status Badge */}
                <td className="py-3 px-4">
                  {v.verified ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> {translate("Đã xác minh")}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3" /> {translate("Chưa xác minh")}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleVerification(v)}
                      disabled={busyId !== null}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        v.verified
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                      }`}
                      title={v.verified ? translate("Hủy xác minh địa điểm này") : translate("Bấm để xác minh địa điểm này")}
                    >
                      <FiShield className="w-3 h-3" />
                      <span>{v.verified ? translate("Bỏ xác minh") : translate("Xác minh")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(v)}
                      className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                      title={translate("Chỉnh sửa địa điểm")}
                    >
                      <FiEdit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(v)}
                      className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title={translate("Xóa địa điểm khỏi hệ thống")}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VenueTable;
