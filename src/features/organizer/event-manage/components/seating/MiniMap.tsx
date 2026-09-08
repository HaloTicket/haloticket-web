import React from 'react';
import { FiMap } from 'react-icons/fi';
import type { MiniMapProps } from '@/types/seating';

const MAP_WIDTH = 180;
const MAP_HEIGHT = 116;

// minimap navigation component
export const MiniMap: React.FC<MiniMapProps> = ({
    seats,
    stages,
    zones,
    viewportWidth,
    viewportHeight,
    scrollLeft,
    scrollTop,
    canvasWidth,
    canvasHeight,
    zoomLevel,
    onNavigate,
}) => {
    const scale = Math.min(MAP_WIDTH / Math.max(canvasWidth, 1), MAP_HEIGHT / Math.max(canvasHeight, 1));
    const scaledContentW = canvasWidth * scale;
    const scaledContentH = canvasHeight * scale;
    const zoom = zoomLevel / 100;

    // handle navigation on minimap click
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / scale;
        const clickY = (e.clientY - rect.top) / scale;
        onNavigate((clickX - viewportWidth / (2 * zoom)) * zoom, (clickY - viewportHeight / (2 * zoom)) * zoom);
    };

    return (
        <div
            className="absolute bottom-4 right-4 z-30 rounded-xl border app-border app-bg-card shadow-xl overflow-hidden select-none"
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        >
            <div className="absolute top-1 left-1.5 z-10 flex items-center gap-1 text-[9px] font-extrabold app-text-muted uppercase tracking-wider pointer-events-none">
                <FiMap className="w-2.5 h-2.5" />
                <span>Minimap</span>
            </div>

            <div
                onClick={handleClick}
                className="relative w-full h-full app-bg-main cursor-crosshair"
                title="Nhấp để di chuyển nhanh đến vị trí trên sơ đồ"
            >
                <div
                    className="absolute top-0 left-0"
                    style={{ width: scaledContentW, height: scaledContentH }}
                >
                    {Object.values(zones).map((zone) => {
                        if (!zone.x || !zone.y || !zone.width || !zone.height) return null;
                        return (
                            <div
                                key={zone.id}
                                className="absolute rounded-xs opacity-60"
                                style={{
                                    left: zone.x * scale,
                                    top: zone.y * scale,
                                    width: Math.max(zone.width * scale, 1),
                                    height: Math.max(zone.height * scale, 1),
                                    backgroundColor: zone.color,
                                }}
                            />
                        );
                    })}

                    {stages.map((stage) => (
                        <div
                            key={stage.id}
                            className="absolute bg-slate-400 rounded-xs"
                            style={{
                                left: stage.x * scale,
                                top: stage.y * scale,
                                width: Math.max(stage.width * scale, 2),
                                height: Math.max(stage.height * scale, 2),
                            }}
                        />
                    ))}

                    {seats.map((seat) => (
                        <div
                            key={seat.id}
                            className="absolute rounded-full"
                            style={{
                                left: seat.x * scale,
                                top: seat.y * scale,
                                width: 1.5,
                                height: 1.5,
                                backgroundColor: seat.color || '#3b82f6',
                            }}
                        />
                    ))}

                    {/* Khung thể hiện vùng đang xem trong khung nhìn chính */}
                    <div
                        className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                        style={{
                            left: (scrollLeft / zoom) * scale,
                            top: (scrollTop / zoom) * scale,
                            width: (viewportWidth / zoom) * scale,
                            height: (viewportHeight / zoom) * scale,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default MiniMap;