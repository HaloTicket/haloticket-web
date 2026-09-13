import React, { useState } from "react";
import { FiLayers, FiSave } from "react-icons/fi";
import type { SeatMapDocument, ZoneBlock, Seat, StageElement, StructureElement, CanvasSettings } from "@/types/seating";
import { SeatCanvas } from "@/features/organizer/event-manage/components/seating/SeatCanvas";
import { ToolBar } from "@/features/organizer/event-manage/components/seating/ToolBar";
import { DEFAULT_CANVAS_SETTINGS } from "@/utils/seatMapHelpers";

interface SeatMapDesignerProps {
  initialDocument?: SeatMapDocument | null;
  onSaveLayout: (document: SeatMapDocument) => void;
  onClose?: () => void;
}

export const SeatMapDesigner: React.FC<SeatMapDesignerProps> = ({
  initialDocument,
  onSaveLayout,
  onClose
}) => {
  const [zones, setZones] = useState<Record<string, ZoneBlock>>(initialDocument?.zones || {
    zone_A: {
      id: "zone_A",
      name: "Khu vực A (VIP)",
      color: "#3b82f6",
      fillColor: "#3b82f6",
      strokeColor: "#2563eb",
      curvature: 16,
      x: 100,
      y: 160,
      width: 400,
      height: 250,
      rotation: 0
    }
  });

  const [seats, setSeats] = useState<Seat[]>(initialDocument?.seats || []);
  const [stages, setStages] = useState<StageElement[]>(initialDocument?.stages || [
    {
      id: "stage_main",
      type: "stage",
      label: "SÂN KHẤU CHÍNH",
      x: 150,
      y: 40,
      width: 300,
      height: 70,
      color: "#1e293b",
      rotation: 0
    }
  ]);
  const [structures, setStructures] = useState<StructureElement[]>(initialDocument?.structures || []);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(initialDocument?.canvasSettings || DEFAULT_CANVAS_SETTINGS);

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const handleSave = () => {
    const doc: SeatMapDocument = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      name: "Sơ đồ thiết kế",
      venueTemplateId: "custom",
      canvasSettings,
      zones,
      stages,
      structures,
      seats,
      ticketTiers: []
    };
    onSaveLayout(doc);
    if (onClose) onClose();
  };

  const handleDeleteSelected = () => {
    if (selectedSeatIds.length > 0) {
      setSeats((prev) => prev.filter((s) => !selectedSeatIds.includes(s.id)));
      setSelectedSeatIds([]);
    }
    if (selectedStageId) {
      setStages((prev) => prev.filter((st) => st.id !== selectedStageId));
      setSelectedStageId(null);
    }
    if (selectedStructureId) {
      setStructures((prev) => prev.filter((st) => st.id !== selectedStructureId));
      setSelectedStructureId(null);
    }
    if (selectedZoneId) {
      const nextZones = { ...zones };
      delete nextZones[selectedZoneId];
      setZones(nextZones);
      setSelectedZoneId(null);
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedSeatIds.length > 0) {
      const selected = seats.filter((s) => selectedSeatIds.includes(s.id));
      const duplicates: Seat[] = selected.map((s, idx) => ({
        ...s,
        id: `seat_copy_${Date.now()}_${idx}`,
        x: s.x + 20,
        y: s.y + 20,
        number: s.number + 100
      }));
      setSeats((prev) => [...prev, ...duplicates]);
      setSelectedSeatIds(duplicates.map((d) => d.id));
    }
  };

  const handleSelectAll = () => {
    setSelectedSeatIds(seats.map((s) => s.id));
  };

  return (
    <div className="flex flex-col h-[750px] w-full app-bg-card border app-border rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b app-border bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <FiLayers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold app-text-main">Bước 1: Thiết kế Layout Sơ đồ ghế (Visual Designer Canvas)</h3>
            <p className="text-[11px] app-text-muted">Vẽ khu vực, đặt hàng ghế, sân khấu & lối đi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border app-border text-xs font-bold app-text-muted hover:app-text-main cursor-pointer"
            >
              Hủy
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
          >
            <FiSave className="w-4 h-4" />
            <span>Lưu bản thiết kế sơ đồ</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <div className="w-64 border-r app-border p-4 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto no-scrollbar space-y-4">
          <ToolBar
            zones={zones}
            tiers={[]}
            selectedSeatIds={selectedSeatIds}
            canvasSettings={canvasSettings}
            onAddRow={(rowLetter, count) => {
              const targetZoneId = selectedZoneId || Object.keys(zones)[0] || "zone_A";
              const rLetter = typeof rowLetter === "string" ? rowLetter : rowLetter?.rowLetter || "A";
              const cnt = typeof count === "number" ? count : rowLetter?.count || 10;
              const newSeats: Seat[] = Array.from({ length: cnt }, (_, i) => ({
                id: `seat_${Date.now()}_${i}`,
                row: rLetter,
                number: i + 1,
                col: i + 1,
                x: 180 + i * 36,
                y: 260,
                zoneId: targetZoneId,
                status: "available",
                shape: "rounded",
                rotation: 0
              }));
              setSeats((prev) => [...prev, ...newSeats]);
            }}
            onAddMatrix={(rows, cols, startLetter) => {
              const targetZoneId = selectedZoneId || Object.keys(zones)[0] || "zone_A";
              const rCount = typeof rows === "number" ? rows : rows?.rows || 4;
              const cCount = typeof cols === "number" ? cols : rows?.cols || 10;
              const sLetter = typeof startLetter === "string" ? startLetter : rows?.startRowLetter || "A";
              const startChar = sLetter.charCodeAt(0);
              const newSeats: Seat[] = [];
              for (let r = 0; r < rCount; r++) {
                const rName = String.fromCharCode(startChar + r);
                for (let c = 0; c < cCount; c++) {
                  newSeats.push({
                    id: `seat_${Date.now()}_${r}_${c}`,
                    row: rName,
                    number: c + 1,
                    col: c + 1,
                    x: 180 + c * 36,
                    y: 260 + r * 36,
                    zoneId: targetZoneId,
                    status: "available",
                    shape: "rounded",
                    rotation: 0
                  });
                }
              }
              setSeats((prev) => [...prev, ...newSeats]);
            }}
            onAddArc={() => {}}
            onAddTable={() => {}}
            onAddStage={(kind, label) => {
              const stageKind = (kind === "t_stage" || kind === "stage") ? kind : "stage";
              const stageLabel = typeof label === "string" ? label : (typeof kind === "string" ? kind : "SÂN KHẤU CHÍNH");
              setStages((prev) => [
                ...prev,
                {
                  id: `stage_${Date.now()}`,
                  type: stageKind,
                  label: stageLabel,
                  x: 200,
                  y: 50,
                  width: 280,
                  height: 60,
                  color: "#1e293b",
                  rotation: 0
                }
              ]);
            }}
            onAddStructure={(type) => {
              const sType = typeof type === "string" ? type as any : "structure";
              setStructures((prev) => [
                ...prev,
                {
                  id: `struct_${Date.now()}`,
                  type: sType,
                  label: String(sType).toUpperCase(),
                  x: 100,
                  y: 550,
                  width: 100,
                  height: 40,
                  color: "#64748b",
                  rotation: 0
                }
              ]);
            }}
            onAddZoneBlock={(configOrName) => {
              const nameStr = typeof configOrName === "string" ? configOrName : configOrName?.name || `Khu vực mới ${Object.keys(zones).length + 1}`;
              const colorStr = typeof configOrName === "object" ? configOrName?.color || "#06b6d4" : "#06b6d4";
              const widthNum = typeof configOrName === "object" ? configOrName?.width || 520 : 520;
              const heightNum = typeof configOrName === "object" ? configOrName?.height || 220 : 220;
              const borderStyleStr = typeof configOrName === "object" ? configOrName?.borderStyle || "dashed" : "dashed";
              const newId = `zone_${Date.now()}`;
              setZones((prev) => ({
                ...prev,
                [newId]: {
                  id: newId,
                  name: nameStr,
                  color: colorStr,
                  fillColor: colorStr,
                  strokeColor: colorStr,
                  borderStyle: borderStyleStr,
                  curvature: 16,
                  x: 150,
                  y: 200,
                  width: widthNum,
                  height: heightNum,
                  rotation: 0
                }
              }));
            }}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            onSelectAll={handleSelectAll}
          />
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-slate-900 overflow-auto relative p-4 flex items-center justify-center">
          <SeatCanvas
            seats={seats}
            stages={stages}
            structures={structures}
            zones={zones}
            tiers={[]}
            canvasSettings={canvasSettings}
            selectedSeatIds={selectedSeatIds}
            setSelectedSeatIds={setSelectedSeatIds}
            selectedStageId={selectedStageId}
            setSelectedStageId={setSelectedStageId}
            selectedStructureId={selectedStructureId}
            setSelectedStructureId={setSelectedStructureId}
            selectedZoneId={selectedZoneId}
            setSelectedZoneId={setSelectedZoneId}
            onUpdateSeats={setSeats}
            onUpdateStages={setStages}
            onUpdateStructures={setStructures}
            onUpdateZones={setZones}
            onUpdateCanvasSettings={setCanvasSettings}
            onDeleteSelected={handleDeleteSelected}
          />
        </div>
      </div>
    </div>
  );
};

export default SeatMapDesigner;
