import React from "react";

interface SpaceParticlesProps {
  isDark: boolean;
}

interface StarParticle {
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
  kind: "star" | "dot";
  tone: "blue" | "indigo" | "gold";
}

const PARTICLES: StarParticle[] = [
  { top: "10%", left: "12%", size: 12, delay: "0s", duration: "4.0s", kind: "star", tone: "blue" },
  { top: "18%", left: "86%", size: 10, delay: "0.9s", duration: "4.6s", kind: "star", tone: "gold" },
  { top: "34%", left: "5%", size: 6, delay: "1.6s", duration: "3.6s", kind: "dot", tone: "indigo" },
  { top: "40%", left: "93%", size: 7, delay: "0.4s", duration: "4.8s", kind: "dot", tone: "blue" },
  { top: "62%", left: "8%", size: 11, delay: "2.1s", duration: "4.4s", kind: "star", tone: "indigo" },
  { top: "68%", left: "90%", size: 13, delay: "1.2s", duration: "5.0s", kind: "star", tone: "blue" },
  { top: "82%", left: "18%", size: 6, delay: "2.6s", duration: "3.8s", kind: "dot", tone: "gold" },
  { top: "84%", left: "80%", size: 5, delay: "0.7s", duration: "4.1s", kind: "dot", tone: "indigo" },
  { top: "8%", left: "72%", size: 5, delay: "1.9s", duration: "3.5s", kind: "dot", tone: "blue" },
];

/**
 * Các hạt sáng và ngôi sao nhỏ xung quanh cụm minh họa, tạo chiều sâu không gian nhẹ nhàng bằng CSS.
 */
export const SpaceParticles: React.FC<SpaceParticlesProps> = ({ isDark }) => {
  const palette = isDark
    ? {
        blue: "#93c5fd",
        indigo: "#e2e8f0",
        gold: "#fde68a",
      }
    : {
        blue: "#3b82f6",
        indigo: "#818cf8",
        gold: "#f59e0b",
      };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      {PARTICLES.map((p, index) => (
        <span
          key={index}
          className="notfound-star-twinkle absolute block"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            color: palette[p.tone],
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {p.kind === "star" ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
              <path d="M12 1.5L14.4 9.6L22.5 12L14.4 14.4L12 22.5L9.6 14.4L1.5 12L9.6 9.6L12 1.5Z" />
            </svg>
          ) : (
            <span className="block h-full w-full rounded-full bg-current opacity-80" />
          )}
        </span>
      ))}
    </div>
  );
};

export default SpaceParticles;

