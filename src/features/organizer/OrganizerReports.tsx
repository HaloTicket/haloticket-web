import { getLocale } from "@/i18n";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { FiFileText, FiInbox, FiDownloadCloud, FiPlus } from "react-icons/fi";

interface OrganizerReportItem {
  id: string;
  fileName: string;
  createdDate: string;
  creator: string;
  status: string;
}

export const OrganizerReports: React.FC = () => {
  const { t: translate } = useTranslation();
  const [reports, setReports] = useState<OrganizerReportItem[]>([]);

  return (
    <div className="w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">
      {/* Top Quick Actions */}
      <div className="flex justify-end">

        <button
          type="button"
          onClick={() => {
            const newReport = {
              id: `REP_${Date.now().toString().slice(-4)}`,
              fileName: `Bao_Cao_Doanh_Thu_HaloTicket_${new Date().toLocaleDateString(getLocale()).replace(/\//g, "")}.xlsx`,
              createdDate: new Date().toLocaleDateString(getLocale()) + " " + new Date().toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' }),
              creator: "Trần Long Vũ",
              status: "Đã hoàn thành"
            };
            setReports([newReport, ...reports]);
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          <span>{translate("Tạo báo cáo mới")}</span>
        </button>
      </div>

      {/* Reports Table Container */}
      <div className="w-full app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b app-border text-xs font-extrabold app-text-main uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                </th>
                <th className="p-4">{translate("File")}</th>
                <th className="p-4">{translate("Ngày Tạo")}</th>
                <th className="p-4">{translate("Người tạo")}</th>
                <th className="p-4">{translate("Trạng thái xử lý")}</th>
                <th className="p-4 text-right">{translate("Thao tác")}</th>
              </tr>
            </thead>
            <tbody className="divide-y app-border text-xs font-medium app-text-main">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-zinc-400 flex items-center justify-center">
                        <FiInbox className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <span className="text-xs font-extrabold app-text-muted">{translate("No data")}</span>
                      <p className="text-[11px] app-text-muted max-w-xs">
                        {translate("Chưa có file báo cáo nào được khởi tạo trong hệ thống.")} </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                    </td>
                    <td className="p-4 font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FiFileText className="w-4 h-4 shrink-0" />
                      <span>{rep.fileName}</span>
                    </td>
                    <td className="p-4 app-text-muted">{rep.createdDate}</td>
                    <td className="p-4 font-bold">{translate(rep.creator)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-md text-[11px]">
                        {translate(rep.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <FiDownloadCloud className="w-3.5 h-3.5" />
                        <span>{translate("Tải về")}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganizerReports;
