import React, { useState } from "react";
import { FiTag, FiCheck, FiCheckCircle } from "react-icons/fi";
import type { SeatMapDocument } from "@/types/seating";
import type { TicketItem } from "@/types/organizer";
import { SeatCanvas } from "@/features/organizer/event-manage/components/seating/SeatCanvas";
import { formatCurrency } from "@/utils/formatters";

interface SeatMapTicketAssignerProps {
  seatMapDocument: SeatMapDocument;
  tickets: TicketItem[];
  onAssignTierToZone: (zoneId: string, ticketTierId: string) => void;
  onSave?: () => void;
}

export const SeatMapTicketAssigner: React.FC<SeatMapTicketAssignerProps> = ({
  seatMapDocument,
  tickets,
  onAssignTierToZone,
  onSave
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    Object.keys(seatMapDocument.zones || {})[0] || null
  );
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);

  const zonesList = Object.values(seatMapDocument.zones || {});
  const currentSelectedZone = selectedZoneId ? seatMapDocument.zones[selectedZoneId] : null;

  const dummySetSeats = () => {};
  const dummySetStages = () => {};
  const dummySetStructures = () => {};

  return (
    <div className="flex flex-col h-[750px] w-full app-bg-card border app-border rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b app-border bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <FiTag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold app-text-main">Bước 2: Gán Loại Vé & Giá Vé Vào Sơ Đồ (Ticket Tier Assigner)</h3>
            <p className="text-[11px] app-text-muted">Chọn Zone / Khu vực trên sơ đồ để gán hạng vé tương ứng</p>
          </div>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
          >
            <FiCheckCircle className="w-4 h-4" />
            <span>Hoàn tất gán vé sơ đồ</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Panel: Zones & Ticket Tier Selection */}
        <div className="w-80 border-r app-border p-5 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto no-scrollbar space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider app-text-muted">1. Danh sách Khu vực (Zones)</h4>
            <div className="space-y-2">
              {zonesList.length === 0 ? (
                <p className="text-xs app-text-muted italic">Chưa có khu vực nào được vẽ ở Bước 1.</p>
              ) : (
                zonesList.map((z) => {
                  const isSelected = selectedZoneId === z.id;
                  const assignedTicket = tickets.find((t) => t.id === z.tierId);
                  return (
                    <div
                      key={z.id}
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 shadow-xs"
                          : "app-bg-card border-slate-200/80 dark:border-slate-800 hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold app-text-main flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color || "#3b82f6" }} />
                          <span>{z.name}</span>
                        </span>
                        {assignedTicket ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Đã gán
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            Chưa gán vé
                          </span>
                        )}
                      </div>
                      {assignedTicket && (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pl-5">
                          Vé: {assignedTicket.name} — {formatCurrency(assignedTicket.price)}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {currentSelectedZone && (
            <div className="space-y-3 border-t app-border pt-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider app-text-muted">
                2. Chọn Hạng Vé cho <span className="text-blue-600">{currentSelectedZone.name}</span>
              </h4>

              <div className="space-y-2">
                {tickets.length === 0 ? (
                  <p className="text-xs text-rose-500 font-bold">Hãy tạo ít nhất một loại vé ở bảng bên trên trước!</p>
                ) : (
                  tickets.map((ticket) => {
                    const isMapped = currentSelectedZone.tierId === ticket.id;
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => onAssignTierToZone(currentSelectedZone.id, ticket.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isMapped
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "app-bg-card border-slate-200 dark:border-slate-800 hover:border-indigo-500 app-text-main"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-extrabold">{ticket.name}</div>
                          <div className={`text-[11px] font-bold mt-0.5 ${isMapped ? "text-indigo-100" : "app-text-brand"}`}>
                            {formatCurrency(ticket.price)}
                          </div>
                        </div>

                        {isMapped && <FiCheck className="w-5 h-5 text-white shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side Canvas (Read-only visual layout mode) */}
        <div className="flex-1 bg-slate-900 overflow-auto relative p-4 flex items-center justify-center">
          <SeatCanvas
            seats={seatMapDocument.seats || []}
            stages={seatMapDocument.stages || []}
            structures={seatMapDocument.structures || []}
            zones={seatMapDocument.zones || {}}
            tiers={tickets.map((t) => ({
              id: t.id,
              name: t.name,
              price: t.price,
              color: "#3b82f6"
            }))}
            canvasSettings={seatMapDocument.canvasSettings}
            selectedSeatIds={selectedSeatIds}
            setSelectedSeatIds={setSelectedSeatIds}
            selectedStageId={selectedStageId}
            setSelectedStageId={setSelectedStageId}
            selectedStructureId={selectedStructureId}
            setSelectedStructureId={setSelectedStructureId}
            selectedZoneId={selectedZoneId}
            setSelectedZoneId={setSelectedZoneId}
            onUpdateSeats={dummySetSeats as any}
            onUpdateStages={dummySetStages as any}
            onUpdateStructures={dummySetStructures as any}
            onDeleteSelected={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default SeatMapTicketAssigner;
