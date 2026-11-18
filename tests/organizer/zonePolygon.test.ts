import { describe, expect, it } from 'vitest';
import {
  computeRowLabels,
  getElementShapeStyle,
  getZoneSvgPoints,
  getZoneClipPath,
  insertPolygonPoint,
  parseZonePoints,
  pointsToClipPath,
  presetToPoints,
  removePolygonPoint,
} from '@/utils/seatMapHelpers';

describe('đa giác khu vực', () => {
  it('đọc đỉnh từ mảng và chuỗi JSON, bỏ qua dữ liệu sai', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }];
    expect(parseZonePoints(pts)).toEqual(pts);
    expect(parseZonePoints(JSON.stringify(pts))).toEqual(pts);
    expect(parseZonePoints('không phải json')).toBeUndefined();
    expect(parseZonePoints(null)).toBeUndefined();
    expect(parseZonePoints(pts.slice(0, 2))).toBeUndefined();
    expect(parseZonePoints([...pts, { x: 'a', y: 1 }])).toEqual(pts);
  });

  it('dựng clip-path từ đỉnh', () => {
    expect(pointsToClipPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50.123, y: 100 }])).toBe(
      'polygon(0% 0%, 100% 0%, 50.12% 100%)'
    );
  });

  it('getZoneClipPath ưu tiên đỉnh tự do của hình polygon', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    expect(getZoneClipPath('polygon', undefined, pts)).toBe('polygon(0% 0%, 100% 0%, 0% 100%)');
    expect(getZoneClipPath('polygon', 'polygon(1% 1%, 2% 2%, 3% 3%)', undefined)).toBe('polygon(1% 1%, 2% 2%, 3% 3%)');
    expect(getZoneClipPath('rectangle')).toBeUndefined();
  });

  it('chuyển hình dựng sẵn thành đỉnh và không dùng chung tham chiếu', () => {
    const a = presetToPoints('diamond');
    expect(a).toHaveLength(4);
    a[0].x = 99;
    expect(presetToPoints('diamond')[0].x).toBe(50);
    expect(presetToPoints('không-có')).toHaveLength(4);
  });

  it('chèn đỉnh vào giữa cạnh và xóa đỉnh nhưng giữ tối thiểu 3 đỉnh', () => {
    const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    const inserted = insertPolygonPoint(tri, 0);
    expect(inserted).toHaveLength(4);
    expect(inserted[1]).toEqual({ x: 50, y: 0 });
    expect(insertPolygonPoint(tri, 2)[3]).toEqual({ x: 0, y: 50 });
    expect(removePolygonPoint(inserted, 1)).toEqual(tri);
    expect(removePolygonPoint(tri, 0)).toBe(tri);
  });
});

describe('nhãn hàng ghế', () => {
  const zone = (showRowLabels?: 'none' | 'start' | 'both') => ({ z1: { id: 'z1', name: 'A', color: '#000', showRowLabels } });
  const seat = (id: string, number: number, x: number, y: number, row = 'B') =>
    ({ id, row, number, x, y, zoneId: 'z1', status: 'available' as const });

  it('không có nhãn khi khu chưa bật', () => {
    expect(computeRowLabels([seat('a', 1, 0, 0)], zone())).toEqual([]);
    expect(computeRowLabels([seat('a', 1, 0, 0)], zone('none'))).toEqual([]);
  });

  it('đặt nhãn nối dài hàng ra ngoài đầu hàng, và cuối hàng khi chọn hai đầu', () => {
    const row = [seat('a', 1, 100, 50), seat('b', 2, 140, 50), seat('c', 3, 180, 50)];
    expect(computeRowLabels(row, zone('start'), 30)).toEqual([{ key: 'z1|B|start', text: 'B', x: 87, y: 67 }]);
    const both = computeRowLabels(row, zone('both'), 30);
    expect(both.map((l) => [l.key, l.x, l.y])).toEqual([['z1|B|start', 87, 67], ['z1|B|end', 227, 67]]);
  });

  it('sắp theo số ghế dù mảng ghế đảo thứ tự, và bỏ ghế ẩn', () => {
    const row = [seat('c', 3, 180, 50), seat('a', 1, 100, 50), { ...seat('h', 0, 0, 0), hidden: true }];
    expect(computeRowLabels(row, zone('start'), 30)[0].x).toBe(87);
  });

  it('hàng một ghế đặt nhãn bên trái', () => {
    expect(computeRowLabels([seat('a', 1, 100, 50)], zone('start'), 30)[0]).toMatchObject({ x: 87, y: 67 });
  });
});

describe('hình dạng sân khấu và cấu trúc', () => {
  it('trả kiểu bo góc hoặc cắt hình theo hình dạng', () => {
    expect(getElementShapeStyle(undefined)).toEqual({});
    expect(getElementShapeStyle('rounded')).toEqual({});
    expect(getElementShapeStyle('rectangle')).toEqual({ borderRadius: '0px' });
    expect(getElementShapeStyle('ellipse')).toEqual({ borderRadius: '50%' });
    expect(getElementShapeStyle('semicircle').borderRadius).toContain('100%');
    expect(getElementShapeStyle('trapezoid').clipPath).toMatch(/^polygon\(/);
    expect(getElementShapeStyle('runway').clipPath).toMatch(/^polygon\(/);
  });
});

describe('toạ độ đa giác cho bản xem trước SVG', () => {
  it('dùng đỉnh đã lưu, đa giác dựng sẵn hoặc không trả gì cho hình chữ nhật', () => {
    expect(getZoneSvgPoints({ shape: 'polygon', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }] }, 200, 100)).toBe('0,0 200,0 100,100');
    expect(getZoneSvgPoints({ shape: 'diamond' }, 100, 100)).toBe('50,0 100,50 50,100 0,50');
    expect(getZoneSvgPoints({ shape: 'rectangle' }, 100, 100)).toBeUndefined();
    expect(getZoneSvgPoints({ shape: 'rounded' }, 100, 100)).toBeUndefined();
  });
});
