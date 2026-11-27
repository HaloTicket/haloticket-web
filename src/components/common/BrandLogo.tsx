import React from "react";

interface BrandLogoProps {
  variant?: "wordmark" | "mark";
  className?: string;
  ariaLabel?: string;
}

/**
 * Logo HaloTicket tự động chuyển đổi giữa bản sáng và bản tối theo lớp `.dark` trên thẻ gốc,
 * không phụ thuộc `ThemeContext` để dùng an toàn cả trong các bài test không bọc `ThemeProvider`.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "wordmark",
  className = "",
  ariaLabel = "HaloTicket",
}) => {
  if (variant === "mark") {
    return (
      <img
        src="/favicon.png"
        alt={ariaLabel}
        width={1536}
        height={1024}
        draggable={false}
        className={`block object-contain dark:drop-shadow-[0_0_8px_rgba(56,189,248,0.45)] ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="40 80 2100 560"
      className={`block ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <image
        href="/assets/brand/logo-light.png"
        width="2172"
        height="724"
        className="opacity-100 dark:opacity-0 transition-opacity duration-200 motion-reduce:transition-none"
      />
      <image
        href="/assets/brand/logo-dark.png"
        width="2172"
        height="724"
        className="opacity-0 dark:opacity-100 transition-opacity duration-200 motion-reduce:transition-none"
      />
    </svg>
  );
};

export default BrandLogo;
