import { describe, expect, it } from 'vitest';
import { shapesToZones, simplifyPolyline, toHexColor } from '../../src/utils/svgImport';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
];

describe('svgImport', () => {
  it('rút gọn đường gấp khúc: bỏ điểm thẳng hàng, giữ góc', () => {
    const line = [{ x: 0, y: 0 }, { x: 5, y: 0.1 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(simplifyPolyline(line, 0.5)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(simplifyPolyline([{ x: 0, y: 0 }, { x: 1, y: 1 }], 1)).toHaveLength(2);
  });

  it('đổi màu CSS sang hex', () => {
    expect(toHexColor('rgb(255, 0, 16)')).toBe('#ff0010');
    expect(toHexColor('#ABC')).toBe('#aabbcc');
    expect(toHexColor('#112233')).toBe('#112233');
    expect(toHexColor('red')).toBeUndefined();
    expect(toHexColor(null)).toBeUndefined();
  });

  it('đổi hình thành khu: co giãn vừa khung, hình chữ nhật thành rectangle, hình khác thành polygon', () => {
    const tri = [{ x: 200, y: 0 }, { x: 300, y: 100 }, { x: 200, y: 100 }];
    const zones = shapesToZones(
      [{ name: 'A', color: '#ff0000', points: rect(0, 0, 100, 100) }, { name: '', points: tri }],
      { width: 1000, height: 500 },
      50
    );
    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({ name: 'A', shape: 'rectangle', color: '#ff0000', x: 50, y: 50 });
    expect(zones[0].points).toBeUndefined();
    expect(zones[1].shape).toBe('polygon');
    expect(zones[1].name).toBe('Khu 2');
    expect(zones[1].points).toHaveLength(3);
    expect(zones[1].x).toBeGreaterThan(zones[0].x! + zones[0].width!);
    for (const z of zones) {
      expect(z.x! + z.width!).toBeLessThanOrEqual(1000);
      expect(z.y! + z.height!).toBeLessThanOrEqual(500);
    }
    expect(new Set(zones.map((z) => z.id)).size).toBe(2);
  });

  it('bỏ hình nền phủ cả bản vẽ và hình quá nhỏ', () => {
    const shapes = [
      { name: 'nền', points: rect(0, 0, 1000, 1000) },
      { name: 'a', points: rect(100, 100, 200, 200) },
      { name: 'b', points: rect(500, 500, 200, 200) },
      { name: 'ghế', points: rect(900, 900, 5, 5) },
    ];
    expect(shapesToZones(shapes, { width: 1500, height: 1000 }).map((z) => z.name)).toEqual(['a', 'b']);
  });

  it('không có hình hợp lệ thì trả rỗng', () => {
    expect(shapesToZones([], { width: 100, height: 100 })).toEqual([]);
    expect(shapesToZones([{ name: 'x', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }], { width: 100, height: 100 })).toEqual([]);
  });
});
