import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiMapPin, FiUsers, FiLayers, FiSearch, FiCheckCircle, FiStar, FiCalendar, FiEye } from 'react-icons/fi';
import type { VenueTemplate, VenueTemplateModalProps } from '@/types/seating';

// venue template selection modal component with live preview
export const VenueTemplateModal: React.FC<VenueTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  // search query, city filter, and preview state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [previewTemplate, setPreviewTemplate] = useState<VenueTemplate | null>(null);

  useEffect(() => {
    if (templates && templates.length > 0) {
      const current = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      setPreviewTemplate(current);
    }
  }, [templates, selectedTemplateId, isOpen]);

  if (!isOpen) return null;

  // filter templates by search query and city
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.address && tpl.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tpl.pastEvents && tpl.pastEvents.some((ev) => ev.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === 'ALL' || tpl.city === selectedCity;

    return matchesSearch && matchesCity;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl app-bg-card border app-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold app-text-main">
                Xem Trước & Chọn Mẫu Địa Điểm Có Sẵn
              </h3>
              <p className="text-xs app-text-muted">
                Xem trước bản đồ 2D trước khi quyết định áp dụng cho sơ đồ sự kiện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & City Filter */}
        <div className="p-4 border-b app-border bg-slate-500/5 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm mẫu theo địa điểm, tên sự kiện đã diễn ra..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl app-bg-main border app-border text-xs font-bold app-text-main focus:outline-none focus:border-blue-500"
              />
              <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedCity('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCity === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                }`}
              >
                Tất cả TP
              </button>
              <button
                type="button"
                onClick={() => setSelectedCity('TP. Hồ Chí Minh')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCity === 'TP. Hồ Chí Minh'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                }`}
              >
                TP.HCM
              </button>
            </div>
          </div>
        </div>

        {/* Content Body: Split into Left Template List & Right Live Preview Panel */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 max-h-[65vh]">
          {/* Left Column: Template Cards List (7 Cols) */}
          <div className="lg:col-span-7 p-4 overflow-y-auto space-y-3 border-b lg:border-b-0 lg:border-r app-border">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const isPreviewing = previewTemplate?.id === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setPreviewTemplate(tpl)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isPreviewing
                        ? 'border-blue-600 bg-blue-600/5 dark:bg-blue-600/10 ring-2 ring-blue-500/40 shadow-md'
                        : 'app-border app-bg-main hover:border-blue-500/40 hover:shadow-2xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs z-10">
                        <FiCheck className="w-3 h-3" />
                        Đã áp dụng
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-extrabold app-text-main flex items-center gap-2">
                          {tpl.name}
                          {isPreviewing && (
                            <span className="px-2 py-0.2 rounded-md bg-blue-500/20 text-blue-500 text-[10px] font-mono font-bold">
                              Đang xem trước
                            </span>
                          )}
                        </h4>
                        <p className="text-xs app-text-muted line-clamp-2 mt-1">{tpl.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t app-border flex items-center justify-between text-xs app-text-muted">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-500 font-bold font-mono">
                          <FiUsers className="w-3 h-3" />
                          {(tpl.capacity || 2000).toLocaleString('vi-VN')} chỗ
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <FiLayers className="w-3 h-3 text-blue-500" />
                          {Object.keys(tpl.zones || {}).length || 2} Khối zone
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplate(tpl);
                          }}
                          className="px-2.5 py-1 rounded-xl app-bg-card border app-border text-[11px] font-bold app-text-main hover:border-blue-500/40 flex items-center gap-1 cursor-pointer"
                        >
                          <FiEye className="w-3.5 h-3.5 text-blue-500" />
                          <span>Xem trước</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplate(tpl);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>Áp dụng mẫu</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center space-y-2 app-text-muted">
                <p className="text-sm font-bold">Không tìm thấy địa điểm mẫu khớp với từ khóa.</p>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive SVG Map Preview (5 Cols) */}
          <div className="lg:col-span-5 p-5 app-bg-main overflow-y-auto flex flex-col justify-between space-y-4">
            {previewTemplate ? (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b app-border pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                      <FiEye className="w-3.5 h-3.5" /> Live Preview Bố Cục
                    </span>
                    <h4 className="text-sm font-extrabold app-text-main mt-0.5">{previewTemplate.name}</h4>
                  </div>
                  {previewTemplate.capacity && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-mono font-bold">
                      {previewTemplate.capacity.toLocaleString('vi-VN')} Khán giả
                    </span>
                  )}
                </div>

                {/* Live Canvas SVG Render of Template */}
                <div className="relative w-full h-56 rounded-2xl bg-slate-950 border border-slate-800 p-2 overflow-hidden flex items-center justify-center shadow-inner">
                  <svg className="w-full h-full" viewBox="0 0 1000 650" preserveAspectRatio="xMidYMid meet">
                    {/* SVG Grid background lines */}
                    <defs>
                      <pattern id="previewGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#previewGrid)" />

                    {/* Draw Stages */}
                    {(previewTemplate.stages || []).map((stg, idx) => (
                      <g key={idx} transform={`translate(${stg.x}, ${stg.y}) rotate(${stg.rotation || 0})`}>
                        <rect
                          width={stg.width || 400}
                          height={stg.height || 100}
                          rx="12"
                          fill={stg.color || '#6366f1'}
                          stroke="#818cf8"
                          strokeWidth="2"
                        />
                        <text
                          x={(stg.width || 400) / 2}
                          y={(stg.height || 100) / 2}
                          fill="#ffffff"
                          fontSize="22"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {stg.label || 'SÂN KHẤU CHÍNH'}
                        </text>
                      </g>
                    ))}

                    {/* Draw Zones */}
                    {Object.values(previewTemplate.zones || {}).map((zone, idx) => (
                      <g key={idx} transform={`translate(${zone.x}, ${zone.y}) rotate(${zone.rotation || 0})`}>
                        <rect
                          width={zone.width || 250}
                          height={zone.height || 150}
                          rx={zone.curvature || 12}
                          fill={zone.color || '#3b82f6'}
                          fillOpacity="0.3"
                          stroke={zone.color || '#3b82f6'}
                          strokeWidth="3"
                        />
                        <text
                          x={(zone.width || 250) / 2}
                          y={(zone.height || 150) / 2}
                          fill="#ffffff"
                          fontSize="18"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {zone.name || `KHU VỰC ${idx + 1}`}
                        </text>
                      </g>
                    ))}

                    {/* Draw Sample Seats */}
                    {(previewTemplate.seats || []).slice(0, 120).map((seat, idx) => (
                      <circle
                        key={idx}
                        cx={seat.x}
                        cy={seat.y}
                        r="7"
                        fill={previewTemplate.zones?.[seat.zoneId]?.color || '#3b82f6'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    ))}
                  </svg>
                </div>

                {/* Zone Breakdown Stats */}
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold app-text-muted uppercase tracking-wider block">
                    Danh sách Khối Zone trên Mẫu:
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {Object.values(previewTemplate.zones || {}).length > 0 ? (
                      Object.values(previewTemplate.zones || {}).map((z, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl app-bg-card border app-border text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color || '#3b82f6' }} />
                            <span className="font-bold app-text-main">{z.name}</span>
                          </div>
                          <span className="font-mono text-emerald-500 font-bold text-[11px]">
                            {z.capacity ? `${z.capacity} chỗ` : 'Ghế vẽ 2D'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl app-bg-card border app-border text-xs app-text-muted">
                        Bố cục sân khấu tiêu chuẩn sẵn sàng vẽ zone
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm Apply Action Button */}
                <div className="pt-3 border-t app-border mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTemplate(previewTemplate);
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Xác nhận áp dụng mẫu này</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center app-text-muted text-xs font-bold">
                Chọn một mẫu bên trái để xem trước sơ đồ
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t app-border bg-slate-500/5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
