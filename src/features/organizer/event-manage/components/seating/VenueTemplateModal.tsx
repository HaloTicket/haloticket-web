import React, { useState } from 'react';
import { FiX, FiCheck, FiMapPin, FiUsers, FiLayers, FiSearch, FiCheckCircle, FiStar, FiCalendar } from 'react-icons/fi';
import type { VenueTemplateModalProps } from '@/types/seating';

// venue template selection modal component
export const VenueTemplateModal: React.FC<VenueTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  // search query and city filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');

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
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl app-bg-card border app-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold app-text-main">
                Chọn Mẫu Địa Điểm Có Sẵn Trên Hệ Thống
              </h3>
              <p className="text-xs app-text-muted">
                Các địa điểm nổi tiếng đã từng được Ban tổ chức khác thuê & áp dụng thành công
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
                placeholder="Tìm kiếm mẫu theo địa điểm, tên sự kiện đã diễn ra (vd: Anh Trai Say Hi)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl app-bg-main border app-border text-xs font-bold app-text-main focus:outline-none focus:border-blue-500"
              />
              <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedCity('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCity === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                  }`}
              >
                Tất cả TP
              </button>
              <button
                type="button"
                onClick={() => setSelectedCity('TP. Hồ Chí Minh')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCity === 'TP. Hồ Chí Minh'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                  }`}
              >
                TP.HCM
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh]">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => onSelectTemplate(tpl)}
                  className={`relative group p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected
                    ? 'border-blue-600 bg-blue-600/5 dark:bg-blue-600/10 shadow-md ring-2 ring-blue-500/30'
                    : 'app-border app-bg-main hover:border-blue-500/50 hover:shadow-sm'
                    }`}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs z-10">
                      <FiCheck className="w-3.5 h-3.5" />
                      Đang chọn
                    </span>
                  )}

                  <div className="space-y-3">
                    <div className="h-36 rounded-xl bg-slate-900/80 border border-slate-700/50 overflow-hidden relative flex flex-col justify-between p-4">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-extrabold flex items-center gap-1">
                          <FiStar className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {tpl.rating || 5.0} | {tpl.eventsHosted || 10}+ BTC Đã Thuê
                        </span>
                        {tpl.capacity && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                            <FiUsers className="w-3 h-3" />
                            {tpl.capacity.toLocaleString('vi-VN')} chỗ
                          </span>
                        )}
                      </div>

                      <div className="text-center my-auto">
                        <FiLayers className="w-7 h-7 text-blue-500 mx-auto mb-1 opacity-70" />
                        <span className="text-xs text-slate-200 font-extrabold block">
                          {tpl.stages.length} Sân khấu | {tpl.seats.length} Ghế chuẩn 2D
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                        <span>{tpl.city || 'TP.HCM'}</span>
                        <span>HaloTicket Rental Validated</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold app-text-main group-hover:text-blue-600 transition-colors">
                        {tpl.name}
                      </h4>
                      <p className="text-xs app-text-muted line-clamp-2 mt-1">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Past Events Tags */}
                    {tpl.pastEvents && tpl.pastEvents.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sự kiện đã tổ chức tại đây:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {tpl.pastEvents.map((ev, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md app-bg-card border app-border text-[10px] font-medium app-text-muted flex items-center gap-1"
                            >
                              <FiCalendar className="w-2.5 h-2.5 text-blue-500" />
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t app-border flex items-center justify-between text-xs app-text-muted">
                    <div className="flex items-center gap-1.5 font-medium truncate max-w-[200px]">
                      <FiMapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{tpl.address || 'Hệ thống HaloTicket'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(tpl);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      <span>Áp dụng mẫu</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 p-10 text-center space-y-2 app-text-muted">
              <p className="text-sm font-bold">Không tìm thấy địa điểm mẫu khớp với từ khóa.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t app-border bg-slate-500/5 flex justify-end">
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

