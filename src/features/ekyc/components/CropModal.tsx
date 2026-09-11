import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiX, FiZoomIn, FiZoomOut, FiRefreshCw } from "react-icons/fi";

interface CropModalProps {
  /** Blob/Object URL của ảnh cần crop */
  src: string;
  /** Tỷ lệ khung crop (width / height). Mặc định 16/10 cho CCCD nằm ngang */
  aspectRatio?: number;
  onConfirm: (croppedFile: File, previewUrl: string) => void;
  onClose: () => void;
  originalFileName?: string;
  originalMimeType?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

export function CropModal({
  src,
  aspectRatio = 16 / 10,
  onConfirm,
  onClose,
  originalFileName = "cropped.jpg",
  originalMimeType = "image/jpeg",
}: CropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [exporting, setExporting] = useState(false);

  // Crop box dimensions inside container
  const cropW = containerSize.w;
  const cropH = containerSize.h;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !containerSize.w) return;
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cropW, cropH);
    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      imgSize.w * scale,
      imgSize.h * scale
    );
  }, [offset, scale, imgSize, cropW, cropH, containerSize.w]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = Math.round(w / aspectRatio);
      setContainerSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspectRatio]);

  // Load image and fit to crop box
  useEffect(() => {
    if (!containerSize.w) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      setImgSize({ w: iw, h: ih });

      // Fit: scale so image fills the crop box (cover)
      const scaleX = cropW / iw;
      const scaleY = cropH / ih;
      const initScale = Math.max(scaleX, scaleY);
      setScale(initScale);

      // Center
      const scaledW = iw * initScale;
      const scaledH = ih * initScale;
      setOffset({
        x: (cropW - scaledW) / 2,
        y: (cropH - scaledH) / 2,
      });
    };
    img.src = src;
  }, [src, cropW, cropH, containerSize.w]);

  // Clamp offset so image always fills crop box
  const clampOffset = useCallback(
    (ox: number, oy: number, s: number) => {
      const scaledW = imgSize.w * s;
      const scaledH = imgSize.h * s;
      const minX = Math.min(0, cropW - scaledW);
      const minY = Math.min(0, cropH - scaledH);
      const maxX = Math.max(0, cropW - scaledW);
      const maxY = Math.max(0, cropH - scaledH);
      return {
        x: Math.max(minX, Math.min(maxX, ox)),
        y: Math.max(minY, Math.min(maxY, oy)),
      };
    },
    [imgSize, cropW, cropH]
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    const clamped = clampOffset(offset.x, offset.y, newScale);
    setScale(newScale);
    setOffset(clamped);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const raw = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
    setOffset(clampOffset(raw.x, raw.y, scale));
  };
  const handleMouseUp = () => setDragging(false);

  // Touch support
  const lastTouchDist = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    } else if (e.touches.length === 2) {
      lastTouchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragging) {
      const raw = { x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y };
      setOffset(clampOffset(raw.x, raw.y, scale));
    } else if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (dist / lastTouchDist.current)));
      lastTouchDist.current = dist;
      const clamped = clampOffset(offset.x, offset.y, newScale);
      setScale(newScale);
      setOffset(clamped);
    }
  };
  const handleTouchEnd = () => { setDragging(false); lastTouchDist.current = null; };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    const mimeType = originalMimeType === "image/png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) { setExporting(false); return; }
        const file = new File([blob], originalFileName, { type: mimeType, lastModified: Date.now() });
        const url = URL.createObjectURL(file);
        onConfirm(file, url);
      },
      mimeType,
      0.95
    );
  };

  const zoom = (delta: number) => {
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    setOffset(clampOffset(offset.x, offset.y, newScale));
    setScale(newScale);
  };

  const resetFit = () => {
    if (!imgSize.w) return;
    const initScale = Math.max(cropW / imgSize.w, cropH / imgSize.h);
    setScale(initScale);
    setOffset(clampOffset((cropW - imgSize.w * initScale) / 2, (cropH - imgSize.h * initScale) / 2, initScale));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col gap-0 overflow-hidden border border-slate-200 dark:border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-zinc-700">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cắt &amp; Căn chỉnh ảnh</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Kéo để di chuyển · Cuộn/Pinch để thu phóng</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 transition-colors cursor-pointer">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="relative w-full bg-slate-950 overflow-hidden select-none touch-none"
          style={{ height: containerSize.h || 260, cursor: dragging ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {/* Crop frame overlay — rule of thirds grid */}
          <div className="absolute inset-0 pointer-events-none border-2 border-white/40">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/15" />
              ))}
            </div>
          </div>
          {/* Corner handles */}
          {[["top-0 left-0","border-t-2 border-l-2"],["top-0 right-0","border-t-2 border-r-2"],["bottom-0 left-0","border-b-2 border-l-2"],["bottom-0 right-0","border-b-2 border-r-2"]].map(([pos, border]) => (
            <div key={pos} className={`absolute ${pos} w-6 h-6 border-white/80 pointer-events-none ${border}`} />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50">
          <button type="button" onClick={() => zoom(-0.2)} className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-slate-700 dark:text-zinc-200" title="Thu nhỏ">
            <FiZoomOut className="w-4 h-4" />
          </button>
          <div className="text-xs font-mono font-bold text-slate-600 dark:text-zinc-400 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </div>
          <button type="button" onClick={() => zoom(0.2)} className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-slate-700 dark:text-zinc-200" title="Phóng to">
            <FiZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-zinc-600 mx-1" />
          <button type="button" onClick={resetFit} className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-slate-700 dark:text-zinc-200" title="Reset vừa khung">
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={exporting || !containerSize.w}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {exporting ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
            <span>Dùng ảnh này</span>
          </button>
        </div>
      </div>
    </div>
  );
}
