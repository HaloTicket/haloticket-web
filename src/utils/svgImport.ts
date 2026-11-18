import type { ZonePoint, ZoneBlock } from '@/types/seating';

/** Một hình đọc được từ file SVG: tên, màu tô và đường viền đa giác theo toạ độ gốc của SVG. */
export interface ImportedShape {
  name: string;
  color?: string;
  points: ZonePoint[];
}

/** Số khu tối đa nhập một lần, tránh biến cả bản vẽ chi tiết (hàng trăm ghế) thành hàng trăm khu. */
export const MAX_IMPORTED_ZONES = 200;

/** Bảng màu dùng khi hình trong SVG không có màu tô. */
const FALLBACK_COLORS = ['#2563eb', '#9333ea', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

/** Hộp bao của một tập điểm. */
const boundsOf = (points: ZonePoint[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
};

/** Khoảng cách từ điểm tới đoạn thẳng a-b. */
const distanceToSegment = (p: ZonePoint, a: ZonePoint, b: ZonePoint): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/**
 * Rút gọn đường gấp khúc bằng thuật toán Ramer-Douglas-Peucker: bỏ các điểm nằm gần đường thẳng nối hai đầu, giữ lại các góc.
 *
 * @param points - Danh sách điểm theo thứ tự.
 * @param tolerance - Độ lệch tối đa cho phép (cùng đơn vị với toạ độ).
 * @returns Danh sách điểm đã rút gọn, luôn giữ điểm đầu và cuối.
 */
export const simplifyPolyline = (points: ZonePoint[], tolerance: number): ZonePoint[] => {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceToSegment(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [first, last];
  const left = simplifyPolyline(points.slice(0, index + 1), tolerance);
  const right = simplifyPolyline(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
};

/** Đổi màu CSS dạng `rgb(r, g, b)` hoặc `#rgb` sang `#rrggbb`; màu không nhận ra thì trả `undefined`. */
export const toHexColor = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const rgb = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('');
  return undefined;
};

/**
 * Đổi các hình đọc từ SVG thành khu vực đa giác, co giãn vừa khung vẽ và giữ nguyên tỉ lệ.
 * Bỏ hình trùng nền (phủ gần hết bản vẽ khi có nhiều hình) và hình quá nhỏ (ghế, chấm trang trí).
 *
 * @param shapes - Các hình đã đọc.
 * @param canvas - Kích thước khung vẽ đích.
 * @param margin - Lề chừa quanh bản vẽ (px).
 * @returns Danh sách khu vực mới (khu bán theo số lượng, chưa gán hạng vé).
 */
export const shapesToZones = (
  shapes: ImportedShape[],
  canvas: { width: number; height: number },
  margin = 60
): ZoneBlock[] => {
  const usable = shapes.filter((s) => s.points.length >= 3);
  if (usable.length === 0) return [];
  const all = boundsOf(usable.flatMap((s) => s.points));
  if (all.width <= 0 || all.height <= 0) return [];

  const kept = usable.filter((s) => {
    const b = boundsOf(s.points);
    const tiny = b.width < all.width * 0.015 && b.height < all.height * 0.015;
    const background = usable.length > 3 && b.width * b.height >= all.width * all.height * 0.85;
    return !tiny && !background;
  });
  if (kept.length === 0) return [];

  const scale = Math.min((canvas.width - margin * 2) / all.width, (canvas.height - margin * 2) / all.height);
  const stamp = Date.now();

  return kept.slice(0, MAX_IMPORTED_ZONES).map((shape, i) => {
    const b = boundsOf(shape.points);
    const width = Math.max(40, Math.round(b.width * scale));
    const height = Math.max(40, Math.round(b.height * scale));
    const pct = (v: number, origin: number, size: number) => Math.round(Math.min(100, Math.max(0, ((v - origin) / (size || 1)) * 100)) * 100) / 100;
    const points = shape.points.map((p) => ({ x: pct(p.x, b.minX, b.width), y: pct(p.y, b.minY, b.height) }));
    const isRect = points.length === 4 && points.every((p) => (p.x === 0 || p.x === 100) && (p.y === 0 || p.y === 100));
    const color = shape.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    return {
      id: `zone_import_${stamp}_${i}`,
      name: shape.name || `Khu ${i + 1}`,
      color,
      fillColor: color,
      shape: isRect ? 'rectangle' : 'polygon',
      points: isRect ? undefined : points,
      type: 'STANDING',
      x: Math.round(margin + (b.minX - all.minX) * scale),
      y: Math.round(margin + (b.minY - all.minY) * scale),
      width,
      height,
      rotation: 0,
      borderStyle: 'solid',
      fillOpacity: 0.85,
    } as ZoneBlock;
  });
};

/** Các phần tử SVG không vẽ ra hình thật (định nghĩa, mặt nạ, đường cắt). */
const NON_RENDERED = 'defs, clipPath, mask, pattern, symbol, marker, metadata, title, desc';

/**
 * Đọc các hình (đường, đa giác, hình chữ nhật, hình tròn, elip) từ nội dung SVG, đưa về đa giác theo toạ độ gốc của SVG.
 * Chỉ chạy được trong trình duyệt vì dùng hình học thật của phần tử SVG (`getPointAtLength`, `getCTM`).
 * Tên khu lấy từ `data-name`, `id`, `aria-label` hoặc thẻ `<title>`; màu lấy từ màu tô thực tế của hình.
 *
 * @param svgText - Nội dung file SVG.
 * @returns Danh sách hình đọc được.
 * @throws Error khi nội dung không phải SVG hợp lệ.
 */
export const extractSvgShapes = (svgText: string): ImportedShape[] => {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('Nội dung không phải file SVG hợp lệ.');
  }

  // dựng vào một vùng ẩn trong trang để trình duyệt tính được hình học và màu thật
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;visibility:hidden';
  const svg = document.importNode(root, true) as unknown as SVGSVGElement;
  host.appendChild(svg);
  document.body.appendChild(host);

  try {
    const shapes: ImportedShape[] = [];
    const elements = Array.from(svg.querySelectorAll<SVGGeometryElement>('path, polygon, polyline, rect, circle, ellipse'));
    for (const el of elements) {
      if (el.closest(NON_RENDERED)) continue;
      const fill = getComputedStyle(el).fill;
      if (!fill || fill === 'none' || fill === 'transparent') continue;
      const length = el.getTotalLength?.();
      if (!length || !Number.isFinite(length)) continue;

      const ctm = el.getCTM();
      const steps = Math.min(240, Math.max(12, Math.round(length / 4)));
      const raw: ZonePoint[] = [];
      for (let i = 0; i <= steps; i++) {
        const point = el.getPointAtLength((length * i) / steps);
        const mapped = ctm ? new DOMPoint(point.x, point.y).matrixTransform(ctm) : point;
        raw.push({ x: mapped.x, y: mapped.y });
      }
      const box = boundsOf(raw);
      const simplified = simplifyPolyline([...raw, raw[0]], Math.max(box.width, box.height) * 0.01).slice(0, -1);
      if (simplified.length < 3) continue;

      const name =
        el.getAttribute('data-name') ||
        el.getAttribute('id') ||
        el.getAttribute('aria-label') ||
        el.querySelector('title')?.textContent ||
        '';
      shapes.push({ name: name.trim(), color: toHexColor(fill), points: simplified });
    }
    return shapes;
  } finally {
    host.remove();
  }
};
