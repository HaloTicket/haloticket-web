import { useEffect, useState } from 'react';

/**
 * Đo chiều cao thanh tiêu đề dính (`header.sticky`) của layout hiện tại để các cột công cụ dính ngay bên dưới nó khi cuộn trang.
 * Đo lại khi cửa sổ đổi kích thước hoặc tiêu đề đổi chiều cao.
 *
 * @param enabled - Chỉ đo khi true (ví dụ tắt khi đang ở chế độ toàn màn hình, lúc đó không có tiêu đề layout).
 * @param gap - Khoảng cách chừa giữa tiêu đề và cột dính (px).
 * @returns Giá trị `top` (px) nên dùng cho `position: sticky`.
 */
export function useStickyTopOffset(enabled = true, gap = 12): number {
  const [offset, setOffset] = useState(gap);

  useEffect(() => {
    if (!enabled) return;
    const header = document.querySelector<HTMLElement>('header.sticky');
    const measure = () => setOffset(Math.ceil((header?.getBoundingClientRect().height ?? 0) + gap));
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver !== 'undefined' && header ? new ResizeObserver(measure) : null;
    if (header && observer) observer.observe(header);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [enabled, gap]);

  return offset;
}
