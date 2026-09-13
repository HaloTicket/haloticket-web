import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheck, FiMapPin, FiUsers, FiLayers, FiSearch, FiCheckCircle, FiStar, FiCalendar, FiEye, FiFilter, FiChevronDown, FiGlobe } from 'react-icons/fi';
import type { VenueTemplate, VenueTemplateModalProps } from '@/types/seating';
import type { VenueApiData } from '@/types';
import { venueApi } from '@/services/venueApi';

// venue template selection modal component with live preview
export const VenueTemplateModal: React.FC<VenueTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  // search query, city filter, venue location filter, and preview state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('ALL');
  const [previewTemplate, setPreviewTemplate] = useState<VenueTemplate | null>(null);
  const [dbVenues, setDbVenues] = useState<VenueApiData[]>([]);

  // Custom venue dropdown open state & ref
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsVenueDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Fetch public venues from backend DB API
  useEffect(() => {
    if (isOpen) {
      venueApi.getVenues().then((data) => {
        if (data && Array.isArray(data)) {
          // Filter public & verified venues
          const publicVenues = data.filter((v) => v.verified !== false);
          setDbVenues(publicVenues);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (templates && templates.length > 0) {
      const current = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      setPreviewTemplate(current);
    }
  }, [templates, selectedTemplateId, isOpen]);

  // Filter templates by search query, city, and selected venue location
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.address && tpl.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tpl.pastEvents && tpl.pastEvents.some((ev) => ev.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = selectedCity === 'ALL' || tpl.city === selectedCity;

      const matchesVenue =
        selectedVenueId === 'ALL' ||
        tpl.id.includes(selectedVenueId) ||
        (tpl.name && tpl.name.toLowerCase().includes(selectedVenueId.toLowerCase())) ||
        (tpl.address && tpl.address.toLowerCase().includes(selectedVenueId.toLowerCase()));

      return matchesSearch && matchesCity && matchesVenue;
    });
  }, [templates, searchQuery, selectedCity, selectedVenueId]);

  // Group filtered templates by Venue Location
  const groupedVenues = useMemo(() => {
    const map = new Map<string, { venueName: string; address?: string; city?: string; templates: VenueTemplate[] }>();

    filteredTemplates.forEach((tpl) => {
      const key = tpl.address
        ? `${tpl.address.toLowerCase().trim()}_${(tpl.city || '').toLowerCase().trim()}`
        : tpl.name.split(' - ')[0].trim().toLowerCase();

      const venueTitle = tpl.name.split(' - ')[0].trim();

      if (!map.has(key)) {
        map.set(key, {
          venueName: venueTitle,
          address: tpl.address,
          city: tpl.city,
          templates: [],
        });
      }
      map.get(key)!.templates.push(tpl);
    });

    return Array.from(map.values());
  }, [filteredTemplates]);

  // Find all available templates for the venue of the current previewTemplate
  const currentVenueGroupTemplates = useMemo(() => {
    if (!previewTemplate) return [];
    const previewKey = previewTemplate.address
      ? `${previewTemplate.address.toLowerCase().trim()}_${(previewTemplate.city || '').toLowerCase().trim()}`
      : previewTemplate.name.split(' - ')[0].trim().toLowerCase();

    return templates.filter((tpl) => {
      const key = tpl.address
        ? `${tpl.address.toLowerCase().trim()}_${(tpl.city || '').toLowerCase().trim()}`
        : tpl.name.split(' - ')[0].trim().toLowerCase();
      return key === previewKey;
    });
  }, [templates, previewTemplate]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      <div className="w-full max-w-5xl h-[88vh] max-h-[88vh] flex flex-col rounded-2xl app-bg-card border app-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold app-text-main">
                Xem Trước & Chọn Mẫu Địa Điểm Có Sẵn
              </h3>
              <p className="text-xs app-text-muted">
                Xem trước các mẫu sơ đồ 2D của cùng một địa điểm công cộng trước khi áp dụng
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

        {/* Search Bar & Location Filter */}
        <div className="p-4 border-b app-border bg-slate-500/5 space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm mẫu theo tên địa điểm, sự kiện..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl app-bg-main border app-border text-xs font-bold app-text-main focus:outline-none focus:border-blue-500/80 shadow-2xs transition-all"
              />
              <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Custom Venue Location Filter Dropdown */}
            <div className="relative w-full md:w-72" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsVenueDropdownOpen((prev) => !prev)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${selectedVenueId !== 'ALL'
                    ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    : 'app-bg-main border-app-border app-text-main hover:border-blue-500/50'
                  }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FiMapPin className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate font-extrabold">
                    {selectedVenueId === 'ALL'
                      ? `Tất cả địa điểm (${dbVenues.length})`
                      : selectedVenueId}
                  </span>
                </div>
                <FiChevronDown
                  className={`w-4 h-4 app-text-muted transition-transform duration-200 shrink-0 ${isVenueDropdownOpen ? 'rotate-180 text-blue-500' : ''
                    }`}
                />
              </button>

              {/* Custom Dropdown Menu Panel */}
              {isVenueDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl app-bg-card border app-border shadow-2xl z-[100] p-2 space-y-1 max-h-64 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-150">
                  {/* All Venues Option */}
                  <div
                    onClick={() => {
                      setSelectedVenueId('ALL');
                      setIsVenueDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-xs ${selectedVenueId === 'ALL'
                        ? 'bg-blue-600 text-white font-black shadow-xs'
                        : 'app-text-main font-bold hover:bg-slate-500/10'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Tất cả địa điểm công cộng</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80 font-extrabold px-2 py-0.5 rounded-md bg-black/10">
                      {dbVenues.length}
                    </span>
                  </div>

                  {/* DB Public Venues List */}
                  {dbVenues.map((v) => {
                    const venueValue = String(v.name || v.id);
                    const isSelected = selectedVenueId === venueValue;
                    const templateCount = templates.filter((tpl) => {
                      if (tpl.id.includes(String(v.id))) return true;
                      if (tpl.address && v.address && tpl.address.toLowerCase().includes(v.address.toLowerCase().substring(0, 10))) return true;
                      if (tpl.name && tpl.name.toLowerCase().includes((v.name || '').toLowerCase())) return true;
                      return false;
                    }).length || 3;

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedVenueId(venueValue);
                          setIsVenueDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'app-text-main hover:bg-slate-500/10'
                          }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs truncate">{v.name}</span>
                            {v.city && (
                              <span
                                className={`text-[9px] font-bold px-2 py-0.2 rounded-full font-mono shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'
                                  }`}
                              >
                                {v.city}
                              </span>
                            )}
                          </div>
                          {v.address && (
                            <span
                              className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'app-text-muted'
                                }`}
                            >
                              {v.address}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}
                          >
                            {templateCount} mẫu sơ đồ
                          </span>
                          {isSelected && <FiCheck className="w-4 h-4 text-white shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1.5 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCity('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${selectedCity === 'ALL'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                  }`}
              >
                <FiGlobe className="w-3.5 h-3.5" />
                <span>Tất cả TP</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCity('TP. Hồ Chí Minh')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${selectedCity === 'TP. Hồ Chí Minh'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                  }`}
              >
                <span>TP.HCM</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCity('Hà Nội')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${selectedCity === 'Hà Nội'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'app-bg-main border app-border app-text-muted hover:app-text-main'
                  }`}
              >
                <span>Hà Nội</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body: Split into Left Grouped Template List & Right Live Preview Panel */}
        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Column: Grouped Venue Template Cards List (7 Cols) */}
          <div className="lg:col-span-7 p-4 overflow-y-auto overscroll-contain space-y-4 border-b lg:border-b-0 lg:border-r app-border h-full max-h-full">
            {groupedVenues.length > 0 ? (
              groupedVenues.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2.5 pb-2 border-b app-border last:border-b-0 last:pb-0">
                  {/* Venue Location Group Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs shrink-0 font-bold">
                        🏢
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black app-text-main truncate">{group.venueName}</h4>
                        {group.address && (
                          <p className="text-[10px] app-text-muted truncate">{group.address}</p>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold font-mono shrink-0">
                      {group.templates.length} mẫu sơ đồ
                    </span>
                  </div>

                  {/* SeatMap Variant Cards for this Venue Location */}
                  <div className="space-y-2 pl-2">
                    {group.templates.map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      const isPreviewing = previewTemplate?.id === tpl.id;
                      const variantTitle = tpl.name.includes(' - ') ? tpl.name.split(' - ').slice(1).join(' - ') : tpl.name;

                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setPreviewTemplate(tpl)}
                          className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${isPreviewing
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
                              <h5 className="text-xs font-extrabold app-text-main flex items-center gap-2">
                                <span>{variantTitle}</span>
                                {isPreviewing && (
                                  <span className="px-2 py-0.2 rounded-md bg-blue-500/20 text-blue-500 text-[9px] font-mono font-bold">
                                    Đang xem trước
                                  </span>
                                )}
                              </h5>
                              <p className="text-[11px] app-text-muted line-clamp-2 mt-1">{tpl.description}</p>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t app-border flex items-center justify-between text-xs app-text-muted">
                            <div className="flex items-center gap-3 text-[10px]">
                              <span className="flex items-center gap-1 text-emerald-500 font-bold font-mono">
                                <FiUsers className="w-3 h-3" />
                                {(tpl.capacity || 2000).toLocaleString('vi-VN')} chỗ
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <FiLayers className="w-3 h-3 text-blue-500" />
                                {Object.keys(tpl.zones || {}).length || 2} Khối zone
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTemplate(tpl);
                                }}
                                className="px-2.5 py-1 rounded-lg app-bg-card border app-border text-[10px] font-bold app-text-main hover:border-blue-500/40 flex items-center gap-1 cursor-pointer"
                              >
                                <FiEye className="w-3 h-3 text-blue-500" />
                                <span>Xem trước</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTemplate(tpl);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <FiCheckCircle className="w-3 h-3" />
                                <span>Áp dụng mẫu</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center space-y-2 app-text-muted">
                <p className="text-sm font-bold">Không tìm thấy địa điểm mẫu khớp với từ khóa.</p>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive SVG Map Preview (5 Cols) */}
          <div className="lg:col-span-5 p-5 app-bg-main overflow-y-auto overscroll-contain flex flex-col justify-between space-y-4 h-full max-h-full">
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

                {/* Venue Layout Switcher Bar for Same Location */}
                {currentVenueGroupTemplates.length > 1 && (
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <FiLayers className="w-3.5 h-3.5" />
                        Các mẫu sơ đồ khác của địa điểm này ({currentVenueGroupTemplates.length}):
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {currentVenueGroupTemplates.map((vTpl) => {
                        const isActive = previewTemplate.id === vTpl.id;
                        const vTitle = vTpl.name.includes(' - ')
                          ? vTpl.name.split(' - ').slice(1).join(' - ')
                          : vTpl.name;
                        return (
                          <button
                            key={vTpl.id}
                            type="button"
                            onClick={() => setPreviewTemplate(vTpl)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${isActive
                                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                                : 'app-bg-card border app-border app-text-main hover:border-blue-500/50'
                              }`}
                          >
                            <span>{vTitle}</span>
                            {isActive && <FiCheck className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
        <div className="px-6 py-3 border-t app-border bg-slate-500/5 flex justify-end shrink-0">
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

  return createPortal(modalContent, document.body);
};
