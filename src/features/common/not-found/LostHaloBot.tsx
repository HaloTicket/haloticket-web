import React from "react";

export type HaloBotPhase = "walking" | "tripping" | "lost";

interface LostHaloBotProps {
  isDark: boolean;
  phase: HaloBotPhase;
  alt: string;
  walkingAlt: string;
  showImpact?: boolean;
}

/**
 * Mascot HaloBot với 3 giai đoạn chuyển động:
 * 1) walking: bước đi xem bản đồ từ trái vào giữa;
 * 2) tripping: vấp chân và té xuống;
 * 3) lost: ngồi ngơ ngác với hiệu ứng nảy tiếp đất, lơ lửng và nghiêng đầu.
 */
export const LostHaloBot: React.FC<LostHaloBotProps> = ({
  isDark,
  phase,
  alt,
  walkingAlt,
  showImpact = true,
}) => {
  const isMovingPhase = phase === "walking" || phase === "tripping";

  return (
    <div className="relative flex flex-col items-center">
      {/* Consistent stage box prevents vertical layout shift between walk and sitting assets */}
      <div className="relative flex aspect-[1024/935] w-[196px] sm:w-[240px] md:w-[272px] lg:w-[310px] items-end justify-center">
        {isMovingPhase ? (
          <div className={phase === "walking" ? "notfound-bot-walk w-[90%]" : "notfound-bot-trip w-[90%]"}>
            <img
              src="/assets/404/404-bot-walk.png"
              alt={walkingAlt}
              width={1024}
              height={806}
              decoding="async"
              fetchPriority="high"
              draggable={false}
              className="block h-auto w-full object-contain select-none"
            />
          </div>
        ) : (
          <div className={`w-full ${showImpact ? "notfound-bot-land" : ""}`}>
            <div
              className="notfound-bot-float w-full"
              style={showImpact ? { animationDelay: "560ms" } : undefined}
            >
              <div
                className="notfound-bot-confused w-full"
                style={showImpact ? { animationDelay: "900ms" } : undefined}
              >
                <img
                  src={isDark ? "/assets/404/404-bot-dark.png" : "/assets/404/404-bot-light.png"}
                  alt={alt}
                  width={1024}
                  height={935}
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                  className="block h-auto w-full object-contain select-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Walking step puffs */}
        {phase === "walking" && (
          <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-6 sm:left-8">
            <span
              className={`notfound-step-puff block h-2.5 w-2.5 rounded-full ${
                isDark ? "bg-blue-300/45" : "bg-blue-500/35"
              }`}
            />
          </div>
        )}

        {/* Comic impact puffs & stars when HaloBot lands lost */}
        {phase === "lost" && showImpact && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center"
          >
            <span
              className={`notfound-impact-puff-left -ml-20 sm:-ml-28 h-3 w-3 rounded-full ${
                isDark ? "bg-blue-300/55" : "bg-blue-500/40"
              }`}
            />
            <span
              className={`notfound-impact-puff-right ml-20 sm:ml-28 h-3 w-3 rounded-full ${
                isDark ? "bg-indigo-300/55" : "bg-indigo-500/40"
              }`}
            />
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`notfound-impact-star absolute -top-5 -left-2 sm:left-6 h-4 w-4 ${
                isDark ? "text-amber-300" : "text-amber-500"
              }`}
            >
              <path d="M12 1.5L14.4 9.6L22.5 12L14.4 14.4L12 22.5L9.6 14.4L1.5 12L9.6 9.6L12 1.5Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Grounded shadow synced with HaloBot state */}
      <div
        aria-hidden="true"
        className={`pointer-events-none -mt-2 h-3.5 w-32 sm:w-40 lg:w-44 rounded-full blur-md ${
          phase === "walking"
            ? "notfound-walk-shadow"
            : phase === "tripping"
              ? "notfound-trip-shadow"
              : "notfound-bot-shadow"
        } ${isDark ? "bg-[#020617]/70" : "bg-blue-900/20"}`}
      />
    </div>
  );
};

export default LostHaloBot;
