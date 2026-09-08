import type { Seat, ZoneBlock, VenueTemplate } from '@/types/seating';

// default preset zones dictionary
export const PRESET_ZONES: Record<string, ZoneBlock> = {
  svip: {
    id: 'svip',
    name: 'Super VIP / Fanzone (Sát Sân Khấu)',
    color: '#ec4899', // Pink
    price: 3500000,
    x: 130,
    y: 260,
    width: 1040,
    height: 130,
    borderStyle: 'dashed',
  },
  vip: {
    id: 'vip',
    name: 'VIP Zone (Góc Nhìn Đẹp)',
    color: '#f59e0b', // Amber/Gold
    price: 2200000,
    x: 130,
    y: 400,
    width: 1040,
    height: 200,
    borderStyle: 'dashed',
  },
  standard: {
    id: 'standard',
    name: 'Khán Giả Thường (Standard)',
    color: '#3b82f6', // Blue
    price: 1200000,
    x: 130,
    y: 610,
    width: 1040,
    height: 260,
    borderStyle: 'solid',
  },
  economy: {
    id: 'economy',
    name: 'Phổ Thông (CAT 3/CAT 4)',
    color: '#10b981', // Emerald Green
    price: 600000,
    x: 130,
    y: 880,
    width: 1040,
    height: 140,
    borderStyle: 'solid',
  },
  accessible: {
    id: 'accessible',
    name: 'Khu Vực Xe Lăn / Khuyết Tật',
    color: '#8b5cf6', // Purple
    price: 1200000,
    x: 130,
    y: 1030,
    width: 1040,
    height: 80,
    borderStyle: 'dashed',
  },
};

// generate concert stadium seats
function generateConcertStadiumSeats(): Seat[] {

  const seats: Seat[] = [];
  let seatId = 1;

  // Hàng A & B: Super VIP sát sàn Catwalk
  const svipRows = ['A', 'B'];
  svipRows.forEach((rowLetter, rIdx) => {
    for (let i = 0; i < 16; i++) {
      let xOffset = 170 + i * 60;
      if (i >= 8) xOffset += 80; // Central catwalk aisle
      seats.push({
        id: `seat_${seatId++}`,
        row: rowLetter,
        number: i + 1,
        col: i + 1,
        x: xOffset,
        y: 275 + rIdx * 62,
        zoneId: 'svip',
        status: 'available',
        rotation: 0,
        shape: 'rounded',
      });
    }
  });

  // Hàng C, D, E: Khu VIP
  const vipRows = ['C', 'D', 'E'];
  vipRows.forEach((rowLetter, rIdx) => {
    for (let i = 0; i < 16; i++) {
      let xOffset = 170 + i * 60;
      if (i >= 8) xOffset += 80;
      seats.push({
        id: `seat_${seatId++}`,
        row: rowLetter,
        number: i + 1,
        col: i + 1,
        x: xOffset,
        y: 415 + rIdx * 62,
        zoneId: 'vip',
        status: 'available',
        rotation: 0,
        shape: 'rounded',
      });
    }
  });

  // Hàng F, G, H, J: Khu Standard & Xe lăn
  const stdRows = ['F', 'G', 'H', 'J'];
  stdRows.forEach((rowLetter, rIdx) => {
    for (let i = 0; i < 16; i++) {
      let xOffset = 170 + i * 60;
      if (i >= 8) xOffset += 80;

      let zId = 'standard';
      let status: Seat['status'] = 'available';

      if (rowLetter === 'F' && (i === 0 || i === 15)) {
        zId = 'accessible';
        status = 'accessible';
      }

      seats.push({
        id: `seat_${seatId++}`,
        row: rowLetter,
        number: i + 1,
        col: i + 1,
        x: xOffset,
        y: 625 + rIdx * 62,
        zoneId: zId,
        status: status,
        rotation: 0,
        shape: 'rounded',
      });
    }
  });

  return seats;
}

// generate theater arc seats
function generateTheaterArcSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;
  const rows = [
    { letter: 'A', count: 14, radius: 260, zone: 'svip' },
    { letter: 'B', count: 16, radius: 320, zone: 'svip' },
    { letter: 'C', count: 18, radius: 380, zone: 'vip' },
    { letter: 'D', count: 20, radius: 440, zone: 'vip' },
    { letter: 'E', count: 22, radius: 500, zone: 'vip' },
    { letter: 'F', count: 24, radius: 560, zone: 'standard' },
    { letter: 'G', count: 26, radius: 620, zone: 'standard' },
    { letter: 'H', count: 28, radius: 680, zone: 'economy' },
  ];

  const centerX = 650;
  const centerY = 50;

  rows.forEach((r) => {
    const startAngle = Math.PI * 0.25;
    const endAngle = Math.PI * 0.75;
    const angleStep = (endAngle - startAngle) / (r.count - 1);

    for (let i = 0; i < r.count; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + Math.cos(angle) * r.radius;
      const y = centerY + Math.sin(angle) * r.radius;
      const rot = ((angle - Math.PI / 2) * 180) / Math.PI;

      seats.push({
        id: `seat_${seatId++}`,
        row: r.letter,
        number: i + 1,
        col: i + 1,
        x: Math.round(x),
        y: Math.round(y),
        zoneId: r.zone,
        status: 'available',
        rotation: Math.round(rot),
        shape: 'rounded',
      });
    }
  });

  return seats;
}

// generate tech summit seats
function generateTechSummitSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 16; c++) {
      let xOffset = 170 + c * 58;
      if (c > 8) xOffset += 70;
      seats.push({
        id: `seat_${seatId++}`,
        row: `VIP${r}`,
        number: c,
        col: c,
        x: xOffset,
        y: 200 + r * 60,
        zoneId: 'svip',
        status: 'available',
        rotation: 0,
        shape: 'rounded',
      });
    }
  }

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  rows.forEach((rowLetter, rIdx) => {
    for (let c = 1; c <= 16; c++) {
      let xOffset = 170 + c * 58;
      if (c > 8) xOffset += 70;
      seats.push({
        id: `seat_${seatId++}`,
        row: rowLetter,
        number: c,
        col: c,
        x: xOffset,
        y: 360 + rIdx * 60,
        zoneId: rIdx < 3 ? 'vip' : 'standard',
        status: 'available',
        rotation: 0,
        shape: 'rounded',
      });
    }
  });

  return seats;
}

// generate gala table seats
function generateGalaSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;
  const tables = [
    { name: 'Bàn VVIP 1', x: 320, y: 230, zone: 'svip' },
    { name: 'Bàn VVIP 2', x: 650, y: 230, zone: 'svip' },
    { name: 'Bàn VVIP 3', x: 980, y: 230, zone: 'svip' },
    { name: 'Bàn VIP 4', x: 320, y: 470, zone: 'vip' },
    { name: 'Bàn VIP 5', x: 650, y: 470, zone: 'vip' },
    { name: 'Bàn VIP 6', x: 980, y: 470, zone: 'vip' },
    { name: 'Bàn STD 7', x: 320, y: 710, zone: 'standard' },
    { name: 'Bàn STD 8', x: 650, y: 710, zone: 'standard' },
    { name: 'Bàn STD 9', x: 980, y: 710, zone: 'standard' },
  ];

  tables.forEach((tbl, tIdx) => {
    const tableRadius = 95;
    const seatsPerTable = 8;
    for (let i = 0; i < seatsPerTable; i++) {
      const angle = (i * 2 * Math.PI) / seatsPerTable;
      const x = tbl.x + Math.cos(angle) * tableRadius;
      const y = tbl.y + Math.sin(angle) * tableRadius;

      seats.push({
        id: `seat_${seatId++}`,
        row: `Bàn ${tIdx + 1}`,
        number: i + 1,
        col: i + 1,
        x: Math.round(x),
        y: Math.round(y),
        zoneId: tbl.zone,
        status: 'available',
        rotation: Math.round((angle * 180) / Math.PI + 90),
        shape: 'circle',
      });
    }
  });

  return seats;
}

// generate auditorium 2 floor seats
function generateAuditorium2FloorSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  // Lầu 1 VVIP
  ['A', 'B'].forEach((row, rIdx) => {
    for (let i = 0; i < 16; i++) {
      seats.push({
        id: `seat_aud_${seatId++}`,
        row,
        number: i + 1,
        x: 180 + i * 60,
        y: 200 + rIdx * 62,
        zoneId: 'vvip',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Lầu 1 Wing Left R1
  ['C', 'D', 'E'].forEach((row, rIdx) => {
    for (let i = 0; i < 4; i++) {
      seats.push({
        id: `seat_aud_${seatId++}`,
        row: `R1-${row}`,
        number: i + 1,
        x: 180 + i * 60,
        y: 360 + rIdx * 62,
        zoneId: 'r1',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Lầu 1 VIP Center
  ['C', 'D', 'E'].forEach((row, rIdx) => {
    for (let i = 0; i < 6; i++) {
      seats.push({
        id: `seat_aud_${seatId++}`,
        row,
        number: i + 1,
        x: 490 + i * 60,
        y: 360 + rIdx * 62,
        zoneId: 'vip',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Lầu 1 Wing Right R2
  ['C', 'D', 'E'].forEach((row, rIdx) => {
    for (let i = 0; i < 4; i++) {
      seats.push({
        id: `seat_aud_${seatId++}`,
        row: `R2-${row}`,
        number: i + 1,
        x: 900 + i * 60,
        y: 360 + rIdx * 62,
        zoneId: 'r2',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Lầu 2 Khán Giả S
  ['F', 'G', 'H'].forEach((row, rIdx) => {
    for (let i = 0; i < 16; i++) {
      seats.push({
        id: `seat_aud_${seatId++}`,
        row: `Lầu 2 - ${row}`,
        number: i + 1,
        x: 180 + i * 60,
        y: 735 + rIdx * 62,
        zoneId: 'lau2_s',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  return seats;
}

// generate four seasons liveshow seats
function generateLiveshowBonMuaSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  // Tier 1: SVIP - EM (Center)
  ['A', 'B'].forEach((row, rIdx) => {
    for (let i = 0; i < 6; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `SVIP-${row}`,
        number: i + 1,
        x: 480 + i * 60,
        y: 175 + rIdx * 60,
        zoneId: 'svip_em',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Tier 2: VVIP - MỘT BƯỚC YÊU (Center) & VIP DAY DỨT NỖI ĐẦU (Left & Right)
  ['C', 'D'].forEach((row, rIdx) => {
    // Left VIP
    for (let i = 0; i < 3; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `VIP-L-${row}`,
        number: i + 1,
        x: 220 + i * 60,
        y: 315 + rIdx * 60,
        zoneId: 'vip_daydut',
        status: 'available',
        shape: 'rounded',
      });
    }
    // Center VVIP
    for (let i = 0; i < 6; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `VVIP-${row}`,
        number: i + 1,
        x: 480 + i * 60,
        y: 315 + rIdx * 60,
        zoneId: 'vvip_motbuoc',
        status: 'available',
        shape: 'rounded',
      });
    }
    // Right VIP
    for (let i = 0; i < 3; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `VIP-R-${row}`,
        number: i + 1,
        x: 890 + i * 60,
        y: 315 + rIdx * 60,
        zoneId: 'vip_daydut',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Tier 3: DƯỚI NHỮNG CƠN MƯA (Center) & VÔ HÌNH TRONG TIM EM (Left & Right)
  ['E', 'F'].forEach((row, rIdx) => {
    // Left Vô Hình
    for (let i = 0; i < 3; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `VH-L-${row}`,
        number: i + 1,
        x: 200 + i * 60,
        y: 455 + rIdx * 60,
        zoneId: 'vohinhtrongtimem',
        status: 'available',
        shape: 'rounded',
      });
    }
    // Center Dưới Mưa
    for (let i = 0; i < 6; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `DM-${row}`,
        number: i + 1,
        x: 480 + i * 60,
        y: 455 + rIdx * 60,
        zoneId: 'duoinhungconmua',
        status: 'available',
        shape: 'rounded',
      });
    }
    // Right Vô Hình
    for (let i = 0; i < 3; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `VH-R-${row}`,
        number: i + 1,
        x: 890 + i * 60,
        y: 455 + rIdx * 60,
        zoneId: 'vohinhtrongtimem',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Tầng 2: KHÓC CÙNG EM 1, 2, 3
  ['G', 'H'].forEach((row, rIdx) => {
    // Left Khóc 2
    for (let i = 0; i < 3; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `K2-L-${row}`,
        number: i + 1,
        x: 220 + i * 60,
        y: 635 + rIdx * 60,
        zoneId: 'khoccungem2',
        status: 'available',
        shape: 'rounded',
      });
    }
    // Center Khóc 1
    for (let i = 0; i < 6; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `K1-${row}`,
        number: i + 1,
        x: 480 + i * 60,
        y: 635 + rIdx * 60,
        zoneId: 'khoccungem1',
        status: 'available',
        shape: 'rounded',
      });
    }
    // Right Khóc 2
    for (let i = 0; i < 3; i++) {
      seats.push({
        id: `seat_bm_${seatId++}`,
        row: `K2-R-${row}`,
        number: i + 1,
        x: 890 + i * 60,
        y: 635 + rIdx * 60,
        zoneId: 'khoccungem2',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  // Khóc 3 (Row J)
  for (let i = 0; i < 6; i++) {
    seats.push({
      id: `seat_bm_${seatId++}`,
      row: `K3-J`,
      number: i + 1,
      x: 480 + i * 60,
      y: 745,
      zoneId: 'khoccungem3',
      status: 'available',
      shape: 'rounded',
    });
  }

  return seats;
}

// generate say hi concert seats
function generateConcertSayHiSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  // President Table
  for (let i = 0; i < 2; i++) {
    seats.push({
      id: `seat_sh_${seatId++}`,
      row: `PRESIDENT`,
      number: i + 1,
      x: 440 + i * 60,
      y: 645,
      zoneId: 'president',
      status: 'available',
      shape: 'square',
    });
  }

  // Sky Lounge
  for (let i = 0; i < 3; i++) {
    seats.push({
      id: `seat_sh_${seatId++}`,
      row: `SKY LOUNGE`,
      number: i + 1,
      x: 580 + i * 60,
      y: 645,
      zoneId: 'skylounge',
      status: 'available',
      shape: 'circle',
    });
  }

  // SVIP A & B
  for (let i = 0; i < 1; i++) {
    seats.push({
      id: `seat_sh_${seatId++}`,
      row: `SVIP-A`,
      number: i + 1,
      x: 350,
      y: 645,
      zoneId: 'svip_ab',
      status: 'available',
      shape: 'rounded',
    });
    seats.push({
      id: `seat_sh_${seatId++}`,
      row: `SVIP-B`,
      number: i + 1,
      x: 790,
      y: 645,
      zoneId: 'svip_ab',
      status: 'available',
      shape: 'rounded',
    });
  }

  // VIP A & B
  for (let i = 0; i < 1; i++) {
    seats.push({
      id: `seat_sh_${seatId++}`,
      row: `VIP-A`,
      number: i + 1,
      x: 240,
      y: 645,
      zoneId: 'vip_ab',
      status: 'available',
      shape: 'rounded',
    });
    seats.push({
      id: `seat_sh_${seatId++}`,
      row: `VIP-B`,
      number: i + 1,
      x: 890,
      y: 645,
      zoneId: 'vip_ab',
      status: 'available',
      shape: 'rounded',
    });
  }

  // CAT 1A & 1B (Seated rear rows A, B)
  ['A', 'B'].forEach((row, rIdx) => {
    for (let i = 0; i < 4; i++) {
      // CAT 1A Left
      seats.push({
        id: `seat_sh_${seatId++}`,
        row: `CAT1A-${row}`,
        number: i + 1,
        x: 270 + i * 60,
        y: 735 + rIdx * 60,
        zoneId: 'cat1_ab',
        status: 'available',
        shape: 'rounded',
      });
      // CAT 1B Right
      seats.push({
        id: `seat_sh_${seatId++}`,
        row: `CAT1B-${row}`,
        number: i + 1,
        x: 790 + i * 60,
        y: 735 + rIdx * 60,
        zoneId: 'cat1_ab',
        status: 'available',
        shape: 'rounded',
      });
    }
  });

  return seats;
}

// generate chong gai concert seats
function generateConcertChongGaiSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  // HẮC MÃ 1 & 2 (Trong lòng M)
  seats.push({ id: `seat_cg_${seatId++}`, row: 'HẮC MÃ 1', number: 1, x: 580, y: 180, zoneId: 'hac_ma', status: 'available', shape: 'rounded' });
  seats.push({ id: `seat_cg_${seatId++}`, row: 'HẮC MÃ 2', number: 1, x: 680, y: 180, zoneId: 'hac_ma', status: 'available', shape: 'rounded' });

  // BẠCH MÃ 1 & 2
  seats.push({ id: `seat_cg_${seatId++}`, row: 'BẠCH MÃ 1', number: 1, x: 580, y: 250, zoneId: 'bach_ma', status: 'available', shape: 'rounded' });
  seats.push({ id: `seat_cg_${seatId++}`, row: 'BẠCH MÃ 2', number: 1, x: 680, y: 250, zoneId: 'bach_ma', status: 'available', shape: 'rounded' });

  // HOẢ LỆNH, CHIẾN TƯỚNG, KỲ SĨ
  ['A', 'B', 'C'].forEach((row, rIdx) => {
    for (let i = 0; i < 2; i++) {
      // HOẢ LỆNH 1 & 2
      seats.push({ id: `seat_cg_${seatId++}`, row: `HL1-${row}`, number: i + 1, x: 450 + i * 55, y: 330 + rIdx * 60, zoneId: 'hoa_lenh', status: 'available', shape: 'rounded' });
      seats.push({ id: `seat_cg_${seatId++}`, row: `HL2-${row}`, number: i + 1, x: 770 + i * 55, y: 330 + rIdx * 60, zoneId: 'hoa_lenh', status: 'available', shape: 'rounded' });

      // CHIẾN TƯỚNG 1 & 2
      seats.push({ id: `seat_cg_${seatId++}`, row: `CT1-${row}`, number: i + 1, x: 340 + i * 55, y: 330 + rIdx * 60, zoneId: 'chien_tuong', status: 'available', shape: 'rounded' });
      seats.push({ id: `seat_cg_${seatId++}`, row: `CT2-${row}`, number: i + 1, x: 880 + i * 55, y: 330 + rIdx * 60, zoneId: 'chien_tuong', status: 'available', shape: 'rounded' });

      // KỲ SĨ 1 & 2
      seats.push({ id: `seat_cg_${seatId++}`, row: `KS1-${row}`, number: i + 1, x: 230 + i * 55, y: 330 + rIdx * 60, zoneId: 'ky_si', status: 'available', shape: 'rounded' });
      seats.push({ id: `seat_cg_${seatId++}`, row: `KS2-${row}`, number: i + 1, x: 990 + i * 55, y: 330 + rIdx * 60, zoneId: 'ky_si', status: 'available', shape: 'rounded' });
    }
  });

  // VINH QUY, SOẠN NHẠC, LÀM MẠNH
  ['A', 'B'].forEach((row, rIdx) => {
    for (let i = 0; i < 4; i++) {
      // VINH QUY 1 & 2
      seats.push({ id: `seat_cg_${seatId++}`, row: `VQ1-${row}`, number: i + 1, x: 400 + i * 55, y: 700 + rIdx * 55, zoneId: 'vinh_quy', status: 'available', shape: 'rounded' });
      seats.push({ id: `seat_cg_${seatId++}`, row: `VQ2-${row}`, number: i + 1, x: 680 + i * 55, y: 700 + rIdx * 55, zoneId: 'vinh_quy', status: 'available', shape: 'rounded' });

      // SOẠN NHẠC 1 & 2
      seats.push({ id: `seat_cg_${seatId++}`, row: `SN1-${row}`, number: i + 1, x: 370 + i * 55, y: 770, zoneId: 'soan_nhac', status: 'available', shape: 'rounded' });
      seats.push({ id: `seat_cg_${seatId++}`, row: `SN2-${row}`, number: i + 1, x: 680 + i * 55, y: 770, zoneId: 'soan_nhac', status: 'available', shape: 'rounded' });

      // LÀM MẠNH 1 & 2
      seats.push({ id: `seat_cg_${seatId++}`, row: `LM1-${row}`, number: i + 1, x: 370 + i * 55, y: 830, zoneId: 'lam_manh', status: 'available', shape: 'rounded' });
      seats.push({ id: `seat_cg_${seatId++}`, row: `LM2-${row}`, number: i + 1, x: 680 + i * 55, y: 830, zoneId: 'lam_manh', status: 'available', shape: 'rounded' });
    }
  });

  return seats;
}

// generate professional theater seats
function generateRapHatChuyenNghiepSeats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  // Tầng 1 (Hàng A - K)
  const tang1Rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

  tang1Rows.forEach((rowLetter, rIdx) => {
    const isVvipRow = rIdx < 5; // A - E center is VVIP Pink
    const yPos = 180 + rIdx * 54;

    // Wing Trái (4 ghế nghiêng)
    for (let c = 1; c <= 4; c++) {
      const isSold = (rIdx === 0 && c > 1) || (rIdx === 1 && c > 1) || (rIdx === 2 && c > 2);
      seats.push({
        id: `seat_rh_${seatId++}`,
        row: rowLetter,
        number: c,
        col: c,
        x: 140 + c * 52,
        y: yPos + (4 - c) * 3,
        zoneId: isVvipRow && c > 2 ? 'rh_vvip' : 'rh_vip',
        status: isSold ? 'sold' : 'available',
        shape: 'circle',
      });
    }

    // Center Corridor Section (14 ghế)
    for (let c = 5; c <= 18; c++) {
      const numInCenter = c - 4;
      const isSold =
        (rIdx === 0 && numInCenter <= 8) ||
        (rIdx === 1 && numInCenter <= 7) ||
        (rIdx === 2 && numInCenter <= 6) ||
        (rIdx === 3 && (numInCenter === 1 || numInCenter === 12 || numInCenter === 13 || numInCenter === 14)) ||
        (rIdx === 4 && (numInCenter === 1 || numInCenter === 2)) ||
        (rIdx === 6 && (numInCenter === 3 || numInCenter === 4)) ||
        (rIdx === 7 && (numInCenter === 8 || numInCenter === 9 || numInCenter === 10 || numInCenter === 11)) ||
        (rIdx === 9 && numInCenter >= 3 && numInCenter <= 7);

      seats.push({
        id: `seat_rh_${seatId++}`,
        row: rowLetter,
        number: c,
        col: c,
        x: 410 + (numInCenter - 1) * 44,
        y: yPos,
        zoneId: isVvipRow ? 'rh_vvip' : 'rh_vip',
        status: isSold ? 'sold' : 'available',
        shape: 'circle',
      });
    }

    // Wing Phải (4 ghế nghiêng)
    for (let c = 19; c <= 22; c++) {
      const numInWing = c - 18;
      const isSold = rIdx < 3 && numInWing <= 3;
      seats.push({
        id: `seat_rh_${seatId++}`,
        row: rowLetter,
        number: c,
        col: c,
        x: 1040 + numInWing * 52,
        y: yPos + numInWing * 3,
        zoneId: isVvipRow && numInWing <= 2 ? 'rh_vvip' : 'rh_vip',
        status: isSold ? 'sold' : 'available',
        shape: 'circle',
      });
    }
  });

  // Tầng 2 / Lầu 2 (Hàng L - S)
  const tang2Rows = ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'];

  tang2Rows.forEach((rowLetter, rIdx) => {
    const yPos = 810 + rIdx * 52;

    // Row L - O: Left block (5 seats), Middle aisle gap, Right block (5 seats)
    if (rIdx < 4) {
      // Left block
      for (let c = 1; c <= 5; c++) {
        const isSold = rIdx === 2 && (c === 3 || c === 4 || c === 5);
        seats.push({
          id: `seat_rh_${seatId++}`,
          row: rowLetter,
          number: c,
          col: c,
          x: 160 + c * 52,
          y: yPos,
          zoneId: 'rh_std',
          status: isSold ? 'sold' : 'available',
          shape: 'circle',
        });
      }
      // Right block
      for (let c = 6; c <= 10; c++) {
        seats.push({
          id: `seat_rh_${seatId++}`,
          row: rowLetter,
          number: c,
          col: c,
          x: 730 + (c - 6) * 52,
          y: yPos,
          zoneId: 'rh_std',
          status: 'available',
          shape: 'circle',
        });
      }
    } else {
      // Row P - S: Full row (16 seats)
      for (let c = 1; c <= 16; c++) {
        const isSold = (rIdx === 6 || rIdx === 7) && c >= 5 && c <= 12;
        seats.push({
          id: `seat_rh_${seatId++}`,
          row: rowLetter,
          number: c,
          col: c,
          x: 160 + c * 60,
          y: yPos,
          zoneId: 'rh_std',
          status: isSold ? 'sold' : 'available',
          shape: 'circle',
        });
      }
    }
  });

  return seats;
}

// generate 360 degree stadium seats
function generateSanVanDong360Seats(): Seat[] {
  const seats: Seat[] = [];
  let seatId = 1;

  // Khán đài A (Bắc - Top, Rows A1-A3, 16 seats/row)
  ['A1', 'A2', 'A3'].forEach((row, rIdx) => {
    for (let i = 0; i < 16; i++) {
      seats.push({
        id: `seat_360_${seatId++}`,
        row: `KĐ-A-${row}`,
        number: i + 1,
        x: 180 + i * 60,
        y: 110 + rIdx * 60,
        zoneId: 'khan_dai_a',
        status: 'available',
        rotation: 0,
        shape: 'rounded',
      });
    }
  });

  // Khán đài C (Nam - Bottom, Rows C1-C3, 16 seats/row)
  ['C1', 'C2', 'C3'].forEach((row, rIdx) => {
    for (let i = 0; i < 16; i++) {
      seats.push({
        id: `seat_360_${seatId++}`,
        row: `KĐ-C-${row}`,
        number: i + 1,
        x: 180 + i * 60,
        y: 690 + rIdx * 60,
        zoneId: 'khan_dai_c',
        status: 'available',
        rotation: 180,
        shape: 'rounded',
      });
    }
  });

  // Khán đài D (Tây - Left wing, 3 cols x 5 rows, rotated 90deg)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      seats.push({
        id: `seat_360_${seatId++}`,
        row: `KĐ-D-R${r + 1}`,
        number: c + 1,
        x: 130 + c * 55,
        y: 350 + r * 55,
        zoneId: 'khan_dai_d',
        status: 'available',
        rotation: 90,
        shape: 'rounded',
      });
    }
  }

  // Khán đài B (Đông - Right wing, 3 cols x 5 rows, rotated 270deg)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      seats.push({
        id: `seat_360_${seatId++}`,
        row: `KĐ-B-R${r + 1}`,
        number: c + 1,
        x: 1030 + c * 55,
        y: 350 + r * 55,
        zoneId: 'khan_dai_b',
        status: 'available',
        rotation: 270,
        shape: 'rounded',
      });
    }
  }

  return seats;
}

// preset venue templates list
export const PRESET_TEMPLATES: VenueTemplate[] = [
  {
    id: 'san_van_dong_360',
    name: 'Sân Vận Động Quốc Gia 360° (Bao Quanh Khán Đài A - B - C - D)',
    address: 'Đường Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    city: 'Hà Nội',
    capacity: 40000,
    eventsHosted: 45,
    pastEvents: ['Trận Đấu Bóng Đá Tuyển Quốc Gia Việt Nam (AFF Cup / V-League)', 'Super Concert 360° World Tour', 'EDM Stadium 4-Sides Festival'],
    rating: 5.0,
    description: 'Cấu trúc 360 độ 4 mặt khán đài bao quanh Sân cỏ trung tâm: Khán Đài A (VIP/VVIP Phía Bắc), Khán Đài C (Phổ Thông Phía Nam), Khán Đài D (Cánh Tây) & Khán Đài B (Cánh Đông)',
    stages: [
      {
        id: 'pitch_center',
        type: 'stage',
        label: 'SÂN BÓNG THẢM CỎ CHÍNH / SÂN KHẤU 360° TRUNG TÂM',
        x: 340,
        y: 340,
        width: 620,
        height: 280,
        color: '#15803d',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'gate_a', type: 'exit', label: 'CỬA VÀO KHÁN ĐÀI A (BẮC)', x: 580, y: 35, width: 160, height: 35, color: '#ef4444' },
      { id: 'gate_c', type: 'exit', label: 'CỬA VÀO KHÁN ĐÀI C (NAM)', x: 580, y: 910, width: 160, height: 35, color: '#ef4444' },
      { id: 'gate_d', type: 'exit', label: 'CỬA D (TÂY)', x: 40, y: 460, width: 35, height: 140, color: '#ef4444' },
      { id: 'gate_b', type: 'exit', label: 'CỬA B (ĐÔNG)', x: 1225, y: 460, width: 35, height: 140, color: '#ef4444' },
    ],
    zones: {
      khan_dai_a: { id: 'khan_dai_a', name: 'KHÁN ĐÀI A (VIP / VVIP PHÍA BẮC)', price: 3500000, color: '#ec4899', x: 150, y: 90, width: 1000, height: 210, borderStyle: 'dashed' },
      khan_dai_c: { id: 'khan_dai_c', name: 'KHÁN ĐÀI C (PHỔ THÔNG PHÍA NAM)', price: 1200000, color: '#3b82f6', x: 150, y: 660, width: 1000, height: 220, borderStyle: 'solid' },
      khan_dai_d: { id: 'khan_dai_d', name: 'KHÁN ĐÀI D (CÁNH TÂY)', price: 2000000, color: '#f59e0b', x: 100, y: 330, width: 210, height: 300, borderStyle: 'solid' },
      khan_dai_b: { id: 'khan_dai_b', name: 'KHÁN ĐÀI B (CÁNH ĐÔNG)', price: 2200000, color: '#10b981', x: 990, y: 330, width: 210, height: 300, borderStyle: 'solid' },
    },
    seats: generateSanVanDong360Seats(),
  },
  {
    id: 'rap_hat_chuyen_nghiep',
    name: 'Nhà Hát Thành Phố / Rạp Khán Phòng Ghế Cong (Professional Theater Arc)',
    address: '7 Công Trường Lam Sơn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 1800,
    eventsHosted: 55,
    pastEvents: ['Vũ Kịch Kẹp Hạt Dẻ (The Nutcracker)', 'Hoà Tấu Dàn Nhạc Giao Hưởng HBSO', 'Showcase Âm Nhạc Cổ Điển'],
    rating: 4.9,
    description: 'Sơ đồ nhà hát vòm cong chi tiết từng ghế có lối đi ở giữa, Hàng A-K khán phòng vòm quạt (Zone Hồng VVIP & Xanh Lá VIP) và Hàng L-S Tầng 2 (Zone Xanh Dương Standard)',
    stages: [
      {
        id: 'stage_rap_hat',
        type: 'stage',
        label: 'SÂN KHẤU CHÍNH (STAGE)',
        x: 250,
        y: 40,
        width: 800,
        height: 100,
        color: '#cbd5e1',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_rh1', type: 'exit', label: 'LỐI THOÁT HIỂM TẦNG 1', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_rh2', type: 'exit', label: 'LỐI THOÁT HIỂM TẦNG 2', x: 1080, y: 50, width: 140, height: 35, color: '#ef4444' },
    ],
    zones: {
      rh_vvip: { id: 'rh_vvip', name: 'TẦNG 1 — HÀNG A-E VVIP TRUNG TÂM', price: 3200000, color: '#d946ef', x: 380, y: 165, width: 540, height: 280, borderStyle: 'dashed' },
      rh_vip: { id: 'rh_vip', name: 'TẦNG 1 — HÀNG A-K VIP VÒM CÁNH', price: 2200000, color: '#22c55e', x: 120, y: 165, width: 1060, height: 600, borderStyle: 'solid' },
      rh_std: { id: 'rh_std', name: 'TẦNG 2 — HÀNG L-S PHỔ THÔNG STANDARD', price: 1200000, color: '#3b82f6', x: 120, y: 785, width: 1060, height: 460, borderStyle: 'solid' },
    },
    seats: generateRapHatChuyenNghiepSeats(),
  },
  {
    id: 'concert_stadium',
    name: 'Sân Vận Động Phú Thọ (Liveshow Concert Anh Trai Say Hi / EDM)',
    address: '221 Lý Thường Kiệt, Quận 11, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 15000,
    eventsHosted: 18,
    pastEvents: ['Anh Trai Say Hi Concert 2024', 'Ravolution Music Festival', 'Hozo Music Festival'],
    rating: 4.9,
    description: 'Thiết kế chuẩn Quốc tế với Sân khấu T-Stage nhô dài + Phân khu Super VIP Fanzone, VIP & Standard',
    stages: [
      {
        id: 'stage_main',
        type: 'stage',
        label: 'SÂN KHẤU CHÍNH (MAIN STAGE)',
        x: 350,
        y: 40,
        width: 600,
        height: 85,
        color: '#6366f1',
        rotation: 0,
      },
      {
        id: 'stage_catwalk',
        type: 'stage',
        label: 'T-CATWALK (SÀN ĐẠO QUANG)',
        x: 600,
        y: 125,
        width: 100,
        height: 135,
        color: '#4f46e5',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_left', type: 'exit', label: 'LỐI THOÁT HIỂM 1 (TÂY)', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_right', type: 'exit', label: 'LỐI THOÁT HIỂM 2 (ĐÔNG)', x: 1080, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'foh_booth', type: 'structure', label: 'KHU KỸ THUẬT FOH (ÂM THANH/ÁNH SÁNG)', x: 520, y: 885, width: 260, height: 45, color: '#64748b' },
    ],
    zones: PRESET_ZONES,
    seats: generateConcertStadiumSeats(),
  },
  {
    id: 'nhat_hat_2_tang',
    name: 'Nhà Hát Bến Thành (Khán Phòng 2 Tầng Lầu 1 & Lầu 2)',
    address: '6 Mạc Đĩnh Chi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 3500,
    eventsHosted: 32,
    pastEvents: ['Kịch Nói Ngày Xửa Ngày Xưa', 'Đêm Nhạc Acoustic Vũ & Friends', 'Liveshow Đêm Sài Gòn'],
    rating: 4.9,
    description: 'Bố trí 2 tầng khán phòng gồm Sân khấu chính, Khu VVIP lầu 1, Cánh trái R1, Khu VIP trung tâm, Cánh phải R2, Bàn kỹ thuật FOH & Khu khán giả lầu 2 (S)',
    stages: [
      {
        id: 'stage_auditorium',
        type: 'stage',
        label: 'SÂN KHẤU KỊCH & HOÀ TẤU CHÍNH',
        x: 350,
        y: 40,
        width: 600,
        height: 85,
        color: '#6366f1',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_left', type: 'exit', label: 'LỐI THOÁT HIỂM LẦU 1', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_right', type: 'exit', label: 'LỐI THOÁT HIỂM LẦU 2', x: 1080, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'foh_aud', type: 'structure', label: 'FOH BÀN ÂM THANH', x: 520, y: 640, width: 260, height: 40, color: '#64748b' },
    ],
    zones: {
      vvip: { id: 'vvip', name: 'Lầu 1 — VVIP Sát Sân Khấu', price: 3500000, color: '#ec4899', x: 150, y: 190, width: 1000, height: 130, borderStyle: 'dashed' },
      r1: { id: 'r1', name: 'Lầu 1 — Cánh Trái R1', price: 2200000, color: '#f59e0b', x: 150, y: 340, width: 280, height: 260, borderStyle: 'solid' },
      vip: { id: 'vip', name: 'Lầu 1 — VIP Trung Tâm', price: 2800000, color: '#3b82f6', x: 460, y: 340, width: 380, height: 260, borderStyle: 'dashed' },
      r2: { id: 'r2', name: 'Lầu 1 — Cánh Phải R2', price: 2200000, color: '#f59e0b', x: 870, y: 340, width: 280, height: 260, borderStyle: 'solid' },
      lau2_s: { id: 'lau2_s', name: 'Lầu 2 — Khán Giả S', price: 1200000, color: '#10b981', x: 150, y: 720, width: 1000, height: 200, borderStyle: 'solid' },
    },
    seats: generateAuditorium2FloorSeats(),
  },
  {
    id: 'liveshow_bon_mua',
    name: 'Trung Tâm Hội Nghị Quốc Gia / SECC (Liveshow Đêm Nhạc Nhạc Trẻ Bốn Mùa)',
    address: '799 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 4500,
    eventsHosted: 40,
    pastEvents: ['Liveshow Vũ - Bảo Tàng Của Nuối Tiếc', 'Concert Đen Vâu', 'Hoàng Dũng Concert'],
    rating: 4.9,
    description: 'Hệ thống phân khu 2 tầng độc đáo theo chủ đề album: SVIP-Em, VVIP-Một Bước Yêu Vạn Dặm Đau, VIP-Day Dứt Nỗi Đau, Khóc Cùng Em 1-3 & Vô Hình Trong Tim Em',
    stages: [
      {
        id: 'stage_bon_mua',
        type: 'stage',
        label: 'SÂN KHẤU TRUNG TÂM BỐN MÙA',
        x: 350,
        y: 40,
        width: 600,
        height: 90,
        color: '#475569',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_bm1', type: 'exit', label: 'LỐI THOÁT HIỂM 1', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_bm2', type: 'exit', label: 'LỐI THOÁT HIỂM 2', x: 1080, y: 50, width: 140, height: 35, color: '#ef4444' },
    ],
    zones: {
      svip_em: { id: 'svip_em', name: 'SVIP — EM', price: 5000000, color: '#1e1b4b', x: 450, y: 160, width: 400, height: 120, borderStyle: 'dashed' },
      vvip_motbuoc: { id: 'vvip_motbuoc', name: 'VVIP — MỘT BƯỚC YÊU VẠN DẠM ĐẦU', price: 3000000, color: '#38bdf8', x: 450, y: 300, width: 400, height: 120, borderStyle: 'dashed' },
      vip_daydut: { id: 'vip_daydut', name: 'VIP — DAY DỨT NỖI ĐẦU', price: 2800000, color: '#312e81', x: 200, y: 300, width: 230, height: 120, borderStyle: 'solid' },
      duoinhungconmua: { id: 'duoinhungconmua', name: 'DƯỚI NHỮNG CƠN MƯA', price: 2400000, color: '#4338ca', x: 450, y: 440, width: 400, height: 120, borderStyle: 'solid' },
      vohinhtrongtimem: { id: 'vohinhtrongtimem', name: 'VÔ HÌNH TRONG TIM EM', price: 2000000, color: '#6366f1', x: 180, y: 440, width: 250, height: 120, borderStyle: 'solid' },
      khoccungem1: { id: 'khoccungem1', name: 'TẦNG 2 — KHÓC CÙNG EM 1', price: 1500000, color: '#06b6d4', x: 450, y: 620, width: 400, height: 100, borderStyle: 'dashed' },
      khoccungem2: { id: 'khoccungem2', name: 'TẦNG 2 — KHÓC CÙNG EM 2', price: 1200000, color: '#1e40af', x: 200, y: 620, width: 230, height: 100, borderStyle: 'solid' },
      khoccungem3: { id: 'khoccungem3', name: 'TẦNG 2 — KHÓC CÙNG EM 3', price: 800000, color: '#e2e8f0', x: 450, y: 730, width: 400, height: 70, borderStyle: 'solid' },
    },
    seats: generateLiveshowBonMuaSeats(),
  },
  {
    id: 'concert_say_hi',
    name: 'Sân Vận Động Mỹ Đình (Say Hi Live Concert 2024)',
    address: 'Đường Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    city: 'Hà Nội',
    capacity: 20000,
    eventsHosted: 25,
    pastEvents: ['Anh Trai Say Hi Concert 2024 (Hà Nội & TP.HCM)', 'Super Junior World Tour', 'Born Pink World Tour'],
    rating: 5.0,
    description: 'Bố trí chuẩn Sân vận động Quốc tế với Sân khấu T-Stage, Bàn VIP President (25 Tr), Sky Lounge (10 Tr), Fanzone A&B (2.5 Tr), GA 1A/1B & CAT 1/2/3',
    stages: [
      {
        id: 'stage_sayhi',
        type: 'stage',
        label: 'SÂN KHẤU CHÍNH CONCERT SAY HI',
        x: 350,
        y: 40,
        width: 600,
        height: 85,
        color: '#334155',
        rotation: 0,
      },
      {
        id: 'stage_sayhi_catwalk',
        type: 'stage',
        label: 'SÀN PLAYHITS T-CATWALK',
        x: 600,
        y: 125,
        width: 100,
        height: 160,
        color: '#0f172a',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_sh1', type: 'exit', label: 'LỐI THOÁT HIỂM KHU A', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_sh2', type: 'exit', label: 'LỐI THOÁT HIỂM KHU B', x: 1080, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'foh_sh', type: 'structure', label: 'KHU KỸ THUẬT FOH CHÍNH', x: 550, y: 740, width: 200, height: 45, color: '#475569' },
    ],
    zones: {
      president: { id: 'president', name: 'PRESIDENT VIP', price: 25000000, color: '#ef4444', x: 420, y: 630, width: 120, height: 60, borderStyle: 'dashed' },
      skylounge: { id: 'skylounge', name: 'SKY LOUNGE', price: 10000000, color: '#f97316', x: 550, y: 630, width: 200, height: 60, borderStyle: 'dashed' },
      svip_ab: { id: 'svip_ab', name: 'SVIP A & B', price: 5000000, color: '#eab308', x: 320, y: 630, width: 90, height: 60, borderStyle: 'solid' },
      vip_ab: { id: 'vip_ab', name: 'VIP A & B', price: 4000000, color: '#84cc16', x: 210, y: 630, width: 90, height: 60, borderStyle: 'solid' },
      fanzone_ab: { id: 'fanzone_ab', name: 'FANZONE A & B (ĐỨNG)', price: 2500000, color: '#ec4899', x: 450, y: 300, width: 130, height: 150, borderStyle: 'dashed' },
      ga1_ab: { id: 'ga1_ab', name: 'GA 1A & 1B (ĐỨNG)', price: 950000, color: '#d946ef', x: 300, y: 300, width: 130, height: 150, borderStyle: 'dashed' },
      ga2_ab: { id: 'ga2_ab', name: 'GA 2A & 2B (ĐỨNG)', price: 800000, color: '#3b82f6', x: 150, y: 300, width: 130, height: 150, borderStyle: 'dashed' },
      cat1_ab: { id: 'cat1_ab', name: 'CAT 1A & 1B (NGỒI)', price: 2000000, color: '#14b8a6', x: 250, y: 720, width: 280, height: 110, borderStyle: 'solid' },
      cat2_ab: { id: 'cat2_ab', name: 'CAT 2A & 2B (CÁNH)', price: 1500000, color: '#1e40af', x: 50, y: 300, width: 80, height: 260, borderStyle: 'solid' },
      cat3_ab: { id: 'cat3_ab', name: 'CAT 3A & 3B (GÓC TẦNG CAO)', price: 1000000, color: '#581c87', x: 50, y: 190, width: 100, height: 90, borderStyle: 'solid' },
    },
    seats: generateConcertSayHiSeats(),
  },
  {
    id: 'concert_chong_gai',
    name: 'Sân Vận Động Quân Khu 7 / Chông Gai (Concert Anh Trai Vượt Ngàn Chông Gai)',
    address: '20A Cộng Hòa, Phường 12, Tân Bình, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 25000,
    eventsHosted: 35,
    pastEvents: ['Concert Anh Trai Vượt Ngàn Chông Gai 2024', 'Sơn Tùng M-TP Sky Tour', 'Rap Việt All-Star Concert'],
    rating: 5.0,
    description: 'Thiết kế độc quyền với Sân khấu M-Catwalk khổng lồ + Khu Đứng Hắc Mã & Bạch Mã trong lòng M, Cánh nghiêng Hoả Lệnh, Chiến Tướng, Kỳ Sĩ, Mỹ Nam, Hoa Lửa & Khu Ngồi Ngoại Ô, S-VIP, Vinh Quy, Soạn Nhạc, Làm Mạnh, Hoả Lộc',
    stages: [
      {
        id: 'stage_cg_main',
        type: 'stage',
        label: 'SÂN KHẤU BIỂU TƯỢNG ANH TRAI CHÔNG GAI',
        x: 350,
        y: 40,
        width: 600,
        height: 110,
        color: '#94a3b8',
        rotation: 0,
      },
      {
        id: 'stage_cg_m_left',
        type: 'stage',
        label: 'NHÁNH M CHỦ ĐẠO (TÂY)',
        x: 500,
        y: 150,
        width: 60,
        height: 140,
        color: '#64748b',
        rotation: 0,
      },
      {
        id: 'stage_cg_m_right',
        type: 'stage',
        label: 'NHÁNH M CHỦ ĐẠO (ĐÔNG)',
        x: 740,
        y: 150,
        width: 60,
        height: 140,
        color: '#64748b',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_cg1', type: 'exit', label: 'LỐI THOÁT HIỂM TÂY', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_cg2', type: 'exit', label: 'LỐI THOÁT HIỂM ĐÔNG', x: 1080, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'foh_cg', type: 'structure', label: 'FOH ÂM THANH ÁNH SÁNG', x: 600, y: 550, width: 100, height: 80, color: '#1e293b' },
    ],
    zones: {
      hac_ma: { id: 'hac_ma', name: 'HẮC MÃ 1 & 2 (SÁT SÂN KHẤU M)', price: 4000000, color: '#047857', x: 560, y: 160, width: 180, height: 70, borderStyle: 'dashed' },
      bach_ma: { id: 'bach_ma', name: 'BẠCH MÃ 1 & 2', price: 3500000, color: '#84cc16', x: 560, y: 240, width: 180, height: 60, borderStyle: 'dashed' },
      hoa_lenh: { id: 'hoa_lenh', name: 'HOẢ LỆNH 1 & 2', price: 2800000, color: '#ea580c', x: 440, y: 310, width: 420, height: 220, borderStyle: 'solid' },
      chien_tuong: { id: 'chien_tuong', name: 'CHIẾN TƯỚNG 1 & 2', price: 2200000, color: '#0d9488', x: 330, y: 310, width: 100, height: 220, borderStyle: 'solid' },
      ky_si: { id: 'ky_si', name: 'KỲ SĨ 1 & 2', price: 1800000, color: '#cbd5e1', x: 220, y: 310, width: 100, height: 220, borderStyle: 'solid' },
      cui_lua: { id: 'cui_lua', name: 'CỦI LỬA & ĐIỆN ẢNH (GÓC NGHIÊNG)', price: 1500000, color: '#f97316', x: 80, y: 220, width: 120, height: 220, borderStyle: 'solid' },
      my_nam: { id: 'my_nam', name: 'MỸ NAM & HOA LỬA (CÁNH VÒM)', price: 1600000, color: '#0284c7', x: 80, y: 470, width: 180, height: 120, borderStyle: 'solid' },
      ngoai_o: { id: 'ngoai_o', name: 'NGOẠI Ô 1 & 2', price: 1500000, color: '#831843', x: 300, y: 550, width: 700, height: 80, borderStyle: 'solid' },
      svip: { id: 'svip', name: 'S-VIP 1 & 2', price: 2500000, color: '#84cc16', x: 380, y: 640, width: 540, height: 40, borderStyle: 'dashed' },
      vinh_quy: { id: 'vinh_quy', name: 'VINH QUY 1 & 2', price: 2000000, color: '#6366f1', x: 380, y: 690, width: 540, height: 60, borderStyle: 'solid' },
      soan_nhac: { id: 'soan_nhac', name: 'SOẠN NHẠC 1 & 2', price: 1500000, color: '#0ea5e9', x: 350, y: 760, width: 600, height: 50, borderStyle: 'solid' },
      lam_manh: { id: 'lam_manh', name: 'LÀM MẠNH 1 & 2', price: 1200000, color: '#0284c7', x: 350, y: 820, width: 600, height: 50, borderStyle: 'solid' },
      hoa_loc: { id: 'hoa_loc', name: 'HOẢ LỘC 1 & 2', price: 800000, color: '#1e1b4b', x: 430, y: 880, width: 440, height: 45, borderStyle: 'solid' },
    },
    seats: generateConcertChongGaiSeats(),
  },
  {
    id: 'theater_acoustic',
    name: 'Nhà Hát Hòa Bình (Rạp Hát / Đêm Nhạc Acoustic)',
    address: '240 Đường 3 Tháng 2, Quận 10, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 2500,
    eventsHosted: 45,
    pastEvents: ['Showcase Sơn Tùng M-TP', 'Đêm Nhạc Trịnh Công Sơn', 'Kịch Nói Ngày Xửa Ngày Xưa'],
    rating: 4.8,
    description: 'Khán phòng cong vòm hình quạt cách âm tiêu chuẩn, tầm nhìn bao quát hướng về sân khấu',
    stages: [
      {
        id: 'stage_theater',
        type: 'stage',
        label: 'SÂN KHẤU THÁP CA HẠT (THEATER STAGE)',
        x: 350,
        y: 40,
        width: 600,
        height: 90,
        color: '#8b5cf6',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_1', type: 'exit', label: 'LỐI THOÁT HIỂM CỬA CHÍNH', x: 80, y: 60, width: 140, height: 35, color: '#ef4444' },
      { id: 'exit_2', type: 'exit', label: 'LỐI THOÁT HIỂM SÂN KHẤU', x: 1080, y: 60, width: 140, height: 35, color: '#ef4444' },
    ],
    zones: {
      svip: { id: 'svip', name: 'Super VIP (Gần Sân Khấu)', price: 3000000, color: '#ec4899', x: 250, y: 220, width: 800, height: 140, borderStyle: 'dashed' },
      vip: { id: 'vip', name: 'VIP Center', price: 2000000, color: '#f59e0b', x: 200, y: 370, width: 900, height: 180, borderStyle: 'dashed' },
      standard: { id: 'standard', name: 'Khán Giả Thường', price: 1000000, color: '#3b82f6', x: 150, y: 560, width: 1000, height: 200, borderStyle: 'solid' },
    },
    seats: generateTheaterArcSeats(),
  },
  {
    id: 'tech_summit',
    name: 'White Palace Phạm Văn Đồng (Vietnam Tech Summit & Developer Day)',
    address: '588 Phạm Văn Đồng, Thủ Đức, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 3000,
    eventsHosted: 28,
    pastEvents: ['Vietnam Web Summit 2024', 'Google DevFest Saigon', 'AWS Cloud Day Vietnam'],
    rating: 4.9,
    description: 'Sân khấu màn hình LED công nghệ cao + Bàn VIP Chủ tọa & Hàng ghế khán giả thẳng tắp',
    stages: [
      {
        id: 'stage_conference',
        type: 'stage',
        label: 'SÂN KHẤU BÁO CÁO & MÀN HÌNH LED CHÍNH',
        x: 350,
        y: 40,
        width: 600,
        height: 75,
        color: '#0284c7',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_c1', type: 'exit', label: 'LỐI RA VẬN CHUYỂN', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
      { id: 'tech_desk', type: 'structure', label: 'BÀN ĐIỀU KHIỂN TRÌNH CHẠY SLIDE', x: 520, y: 800, width: 260, height: 40, color: '#64748b' },
    ],
    zones: {
      svip: { id: 'svip', name: 'Bàn VIP Chủ Tọa', price: 2500000, color: '#ec4899', x: 150, y: 220, width: 1000, height: 130, borderStyle: 'dashed' },
      vip: { id: 'vip', name: 'Khu Vực VIP Speaker', price: 1500000, color: '#f59e0b', x: 150, y: 360, width: 1000, height: 200, borderStyle: 'dashed' },
      standard: { id: 'standard', name: 'Khán Giả Tham Dự', price: 800000, color: '#3b82f6', x: 150, y: 570, width: 1000, height: 220, borderStyle: 'solid' },
    },
    seats: generateTechSummitSeats(),
  },
  {
    id: 'gala_yep',
    name: 'GEM Center Ballroom (Dạ Tiệc Tiệc Gala / Year End Party)',
    address: '8 Nguyễn Bỉnh Khiêm, Đa Kao, Quận 1, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    capacity: 1200,
    eventsHosted: 60,
    pastEvents: ['HaloTicket Gala Awards 2025', 'Tiki Tech Night', 'Shopee Year End Party'],
    rating: 5.0,
    description: 'Bố trí 9 bàn tròn Gala sang trọng (8 ghế/bàn) dành cho sự kiện doanh nghiệp & khách VIP',
    stages: [
      {
        id: 'stage_gala',
        type: 'stage',
        label: 'SÂN KHẤU PHÁT BIỂU & TRAO GIẢI',
        x: 400,
        y: 40,
        width: 500,
        height: 75,
        color: '#06b6d4',
        rotation: 0,
      },
    ],
    structures: [
      { id: 'exit_g1', type: 'exit', label: 'LỐI THOÁT HIỂM SẢNH GALA', x: 80, y: 50, width: 140, height: 35, color: '#ef4444' },
    ],
    zones: {
      svip: { id: 'svip', name: 'Khu Bàn VVIP Sát Sân Khấu', price: 5000000, color: '#ec4899', x: 150, y: 140, width: 1000, height: 220, borderStyle: 'dashed' },
      vip: { id: 'vip', name: 'Khu Bàn VIP Trung Tâm', price: 3000000, color: '#f59e0b', x: 150, y: 380, width: 1000, height: 220, borderStyle: 'dashed' },
      standard: { id: 'standard', name: 'Khu Bàn Standard', price: 1500000, color: '#3b82f6', x: 150, y: 620, width: 1000, height: 220, borderStyle: 'solid' },
    },
    seats: generateGalaSeats(),
  },
];


