import React from "react";

interface SpaceOrbitProps {
  isDark: boolean;
}

/**
 * Hai đường quỹ đạo ellipse mảnh phía sau HaloBot với hạt sáng di chuyển chậm bằng CSS transform.
 */
export const SpaceOrbit: React.FC<SpaceOrbitProps> = ({ isDark }) => {
  const outerRingColor = isDark ? "rgba(96, 165, 250, 0.22)" : "rgba(37, 99, 235, 0.22)";
  const innerRingColor = isDark ? "rgba(129, 140, 248, 0.18)" : "rgba(99, 102, 241, 0.18)";
  const outerDotColor = isDark ? "#60a5fa" : "#2563eb";
  const innerDotColor = isDark ? "#a5b4fc" : "#6366f1";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-visible select-none"
    >
      {/* Outer tilted elliptical orbit */}
      <div className="relative h-[260px] w-[260px] sm:h-[340px] sm:w-[340px] lg:h-[400px] lg:w-[400px] -rotate-[14deg]">
        <div
          className="h-full w-full"
          style={{ transform: "scaleY(0.36)" }}
        >
          <div
            className="relative h-full w-full rounded-full border"
            style={{ borderColor: outerRingColor }}
          >
            <div className="notfound-orbit-spin-slow absolute inset-0">
              <span
                className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: outerDotColor,
                  transform: "scaleY(2.77)",
                  boxShadow: isDark
                    ? "0 0 8px rgba(96, 165, 250, 0.55)"
                    : "0 0 8px rgba(37, 99, 235, 0.35)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inner counter-tilted elliptical orbit */}
      <div className="absolute h-[205px] w-[205px] sm:h-[268px] sm:w-[268px] lg:h-[316px] lg:w-[316px] rotate-[12deg]">
        <div
          className="h-full w-full"
          style={{ transform: "scaleY(0.38)" }}
        >
          <div
            className="relative h-full w-full rounded-full border border-dashed"
            style={{ borderColor: innerRingColor }}
          >
            <div className="notfound-orbit-spin-reverse absolute inset-0">
              <span
                className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: innerDotColor,
                  transform: "scaleY(2.63)",
                  boxShadow: isDark
                    ? "0 0 8px rgba(165, 180, 252, 0.5)"
                    : "0 0 6px rgba(99, 102, 241, 0.3)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceOrbit;

