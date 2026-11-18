import { describe, expect, it } from 'vitest';
import type { Seat, ZoneBlock } from '../../src/types/seating';
import { applyTierStock, getZoneAvailability, getZoneSeats, getZoneSellMode, resolveZoneTier } from '../../src/utils/zoneSales';

const zone = (over: Partial<ZoneBlock> = {}): ZoneBlock => ({ id: 'z1', name: 'Khu A', color: '#000', ...over });
const seat = (id: string, zoneId: string, status: Seat['status'] = 'available'): Seat => ({ id, row: 'A', number: 1, x: 0, y: 0, zoneId, status });

describe('zoneSales', () => {
  it('ghế thuộc khu theo mã, hoặc theo tên (dữ liệu cũ), không theo vị trí', () => {
    const seats = [seat('s1', 'z1'), seat('s2', 'Khu A'), seat('s3', 'z2')];
    expect(getZoneSeats(zone(), seats).map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('kiểu bán suy ra từ việc khu có ghế hay không', () => {
    expect(getZoneSellMode(zone(), [seat('s1', 'z1')])).toBe('SEATED');
    expect(getZoneSellMode(zone(), [seat('s3', 'z2')])).toBe('GENERAL');
  });

  it('khu có ghế: đếm ghế đã bán, đang giữ, chặn, bảo trì, không phân biệt hoa thường', () => {
    const seats = [seat('s1', 'z1', 'sold'), seat('s2', 'z1'), seat('s3', 'z1', 'blocked'), seat('s4', 'z1')];
    const a = getZoneAvailability(zone(), seats, { s2: 'HOLDING' });
    expect(a).toMatchObject({ mode: 'SEATED', total: 4, unavailable: 3, remaining: 1, soldOut: false });
    expect(getZoneAvailability(zone(), seats, { s2: 'HOLDING', s4: 'SOLD' }).soldOut).toBe(true);
  });

  it('trạng thái từ máy chủ thắng trạng thái trong sơ đồ', () => {
    expect(getZoneAvailability(zone(), [seat('s1', 'z1', 'sold')], { s1: 'available' }).remaining).toBe(1);
  });

  it('khu bán theo số lượng: trừ sức chứa, chỉ khớp đúng mã khu', () => {
    const z = zone({ capacity: 3 });
    const status = { z1: 'SOLD', z1_1: 'HOLDING', z10_1: 'SOLD', other_z1: 'SOLD' };
    expect(getZoneAvailability(z, [], status)).toMatchObject({ mode: 'GENERAL', total: 3, unavailable: 2, remaining: 1, soldOut: false });
    expect(getZoneAvailability(z, [], { ...status, z1_2: 'SOLD' }).soldOut).toBe(true);
  });

  it('khu bán theo số lượng chưa khai báo sức chứa không bị coi là hết', () => {
    expect(getZoneAvailability(zone(), [], { z1_1: 'SOLD' })).toMatchObject({ total: null, remaining: null, soldOut: false });
  });

  it('hạng vé: theo mã, theo tên hạng của sơ đồ, theo tên khu trùng hẳn; không đoán', () => {
    const tiers = [{ id: 't1', name: 'VIP' }, { id: 't2', name: 'GA' }];
    expect(resolveZoneTier(zone({ tierId: 't1' }), tiers)?.id).toBe('t1');
    expect(resolveZoneTier(zone({ tierId: 'x9' }), tiers, [{ id: 'x9', name: ' ga ' }])?.id).toBe('t2');
    expect(resolveZoneTier(zone({ tierId: 'x9' }), tiers)).toBeUndefined();
    expect(resolveZoneTier(zone({ name: 'vip' }), tiers)?.id).toBe('t1');
    expect(resolveZoneTier(zone({ name: 'Khu VIP 1' }), tiers)).toBeUndefined();
    expect(resolveZoneTier(zone({ name: 'Khu B' }), [tiers[0]])).toBeUndefined();
  });
});

describe('applyTierStock', () => {
  const base = { mode: 'GENERAL' as const, total: 100, unavailable: 0, remaining: 100, soldOut: false };
  it('lấy số nhỏ hơn giữa sức chứa khu và kho hạng vé', () => {
    expect(applyTierStock(base, 30)).toMatchObject({ remaining: 30, soldOut: false });
    expect(applyTierStock(base, 500).remaining).toBe(100);
    expect(applyTierStock(base, 0)).toMatchObject({ remaining: 0, soldOut: true });
  });
  it('khu chưa khai báo sức chứa dùng kho của hạng vé', () => {
    expect(applyTierStock({ ...base, total: null, remaining: null }, 12).remaining).toBe(12);
  });
  it('không đổi khi chưa biết kho hoặc khu bán theo ghế', () => {
    expect(applyTierStock(base, undefined)).toBe(base);
    const seated = { ...base, mode: 'SEATED' as const };
    expect(applyTierStock(seated, 0)).toBe(seated);
  });
});
