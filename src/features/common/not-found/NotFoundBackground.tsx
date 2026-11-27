import React from "react";

interface NotFoundBackgroundProps {
  isDark: boolean;
}

/**
 * Ảnh nền trang 404 chuyển đổi theo theme Light/Dark.
 * Chỉ render một thẻ `<img>` tại một thời điểm và không dùng CSS filter làm biến đổi màu ảnh.
 */
export const NotFoundBackground: React.FC<NotFoundBackgroundProps> = ({ isDark }) => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      <img
        src={isDark ? "/assets/404/404-background-dark.png" : "/assets/404/404-background-light.png"}
        alt=""
        width={1024}
        height={512}
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className="notfound-bg-drift h-full w-full object-cover object-center"
      />
      {/* Subtle top-edge feather for smooth transition below header */}
      <div
        className={`absolute inset-x-0 top-0 h-14 bg-gradient-to-b ${
          isDark ? "from-[#07123a]/35 to-transparent" : "from-[#f8fafc]/45 to-transparent"
        }`}
      />
    </div>
  );
};

export default NotFoundBackground;

