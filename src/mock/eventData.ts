export interface EventItem {
  id: string;
  title: string;
  price: string;
  date: string;
  image: string;
  location?: string;
  category?: string;
  isHot?: boolean;
  isResale?: boolean;
  rank?: number;
}

export interface ArtistItem {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
}

export interface HeroBannerItem {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  link: string;
  badge?: string;
}

export interface DestinationItem {
  id: string;
  name: string;
  image: string;
  count: number;
}

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "hero-1",
    title: '"SAY HI" PLAYHITS - Live Concert',
    date: "13.09.2026",
    location: "Vạn Phúc City, TP.HCM",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
    link: "/events/say-hi-playhits",
    badge: "CONCERT HOT"
  },
  {
    id: "hero-2",
    title: "'GIỮA MỘT VẠN TOUR' - PHÙNG KHÁNH LINH",
    date: "17.10.2026",
    location: "Sân vận động Phú Thọ, TP.HCM",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80",
    link: "/events/phung-khanh-linh-tour",
    badge: "MỞ RỘNG"
  },
  {
    id: "hero-3",
    title: "XOAY TRÒN CONCERT 2026 - HOÀNG DŨNG",
    date: "06.09.2026",
    location: "Vinhomes Ocean Park 3, Hà Nội",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
    link: "/events/hoang-dung-xoay-tron",
    badge: "VÉ BÁN BỔ SUNG"
  },
  {
    id: "hero-4",
    title: "BỐC FEST 2026 - BỐC LỬA BỎ TẢI NGƯỜI",
    date: "19.09.2026",
    location: "Nhà máy Xe Lửa Gia Lâm, Hà Nội",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80",
    link: "/events/boc-fest-2026",
    badge: "FESTIVAL"
  }
];

export const FEATURED_STARS: ArtistItem[] = [
  {
    id: "star-1",
    name: "Vie Concert",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80",
    verified: true
  },
  {
    id: "star-2",
    name: "SS Label",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    verified: true
  },
  {
    id: "star-3",
    name: "Phùng Khánh Linh",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
    verified: true
  },
  {
    id: "star-4",
    name: "Jun Phạm",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    verified: true
  },
  {
    id: "star-5",
    name: "Cheng",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    verified: true
  },
  {
    id: "star-6",
    name: "Quốc Thiên",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=80",
    verified: true
  },
  {
    id: "star-7",
    name: "Subicha",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80",
    verified: true
  },
  {
    id: "star-8",
    name: "Hoàng Dũng",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
    verified: true
  }
];

export const SPECIAL_EVENTS: EventItem[] = [
  {
    id: "spec-1",
    title: "BỐC FEST - BỐC LỬA BỎ TẢI NGƯỜI",
    price: "599.000đ",
    date: "19 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    category: "Concert",
    isHot: true
  },
  {
    id: "spec-2",
    title: "Eugene Onegin - Vở Vũ Kịch Kinh Điển",
    price: "800.000đ",
    date: "20 tháng 10, 2026",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80",
    category: "Nghệ thuật"
  },
  {
    id: "spec-3",
    title: "Trăng Ơi Trăng À - Nhạc Kịch Thiếu Nhi Trung Thu",
    price: "250.000đ",
    date: "15 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    category: "Sân khấu"
  },
  {
    id: "spec-4",
    title: "Ai Chồng Ai Vợ - Hài Kịch Đặc Sắc 2026",
    price: "350.000đ",
    date: "25 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&q=80",
    category: "Hài kịch"
  },
  {
    id: "spec-5",
    title: "Triển Lãm Bảo Tàng Ẩm Thực Việt Nam",
    price: "120.000đ",
    date: "Hằng ngày 2026",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
    category: "Tham quan"
  }
];

export const TRENDING_EVENTS: EventItem[] = [
  {
    id: "trend-1",
    rank: 1,
    title: "M-CONCERT 2026: VƯỢT NGÀN CHÔNG GAI",
    price: "1.200.000đ",
    date: "17 - 18.10.2026",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80",
    location: "Sân vận động Mỹ Đình, Hà Nội"
  },
  {
    id: "trend-2",
    rank: 2,
    title: "FC ONLINE SUMMER 2026 - VÒNG CHUNG KẾT",
    price: "150.000đ",
    date: "13 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    location: "Cung Thể thao Quần Ngựa, Hà Nội"
  },
  {
    id: "trend-3",
    rank: 3,
    title: "HEINEKEN PICKLEBALL WORLD CUP 2026",
    price: "300.000đ",
    date: "24 - 26.09.2026",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80",
    location: "CLB Lan Anh, TP.HCM"
  },
  {
    id: "trend-4",
    rank: 4,
    title: "ĐÊM NHẠC LIGHT UP THE NIGHT 2026",
    price: "750.000đ",
    date: "05 tháng 10, 2026",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
    location: "Công viên Yên Sở, Hà Nội"
  }
];

export const WEEKEND_EVENTS: EventItem[] = [
  {
    id: "wk-1",
    title: "[LEMLAB] Workshop TRẢI NGHIỆM LÀM GỐM TRẺ EM",
    price: "350.000đ",
    date: "23 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80"
  },
  {
    id: "wk-2",
    title: "Nha Trang Day Tour: Suối Thơm Trekking - Tắm suối thiên nhiên",
    price: "790.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80"
  },
  {
    id: "wk-3",
    title: "City Sightseeing SaiGon: Xe Buýt 2 Tầng",
    price: "105.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80"
  },
  {
    id: "wk-4",
    title: "ĐUA XE GO-KART CITY PARK",
    price: "342.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80"
  }
];

export const RESALE_EVENTS: EventItem[] = [
  {
    id: "res-1",
    title: "Xoay Tròn Concert - Hoàng Dũng",
    price: "Từ 800.000đ",
    date: "06 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",
    isResale: true
  },
  {
    id: "res-2",
    title: "'GIỮA MỘT VẠN TOUR (MỞ RỘNG)' - PHÙNG KHÁNH LINH",
    price: "Từ 950.000đ",
    date: "17 tháng 10, 2026",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
    isResale: true
  },
  {
    id: "res-3",
    title: "Nhà Hát Kịch IDECAF: TẤM CÁM ĐẠI CHIẾN!",
    price: "Từ 350.000đ",
    date: "03 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80",
    isResale: true
  }
];

export const MUSIC_EVENTS: EventItem[] = [
  {
    id: "mus-1",
    title: "BỐC FEST",
    price: "599.000đ",
    date: "19 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&q=80"
  },
  {
    id: "mus-2",
    title: "[BẾN THÀNH] Đêm nhạc SWAN - HUYR - LIGHT",
    price: "300.000đ",
    date: "30 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80"
  },
  {
    id: "mus-3",
    title: "[ĐÀ LẠT LIVE MUSIC] NGƯỜI VIẾT TÊN NỖI BUỒN | 31.08.2026",
    price: "800.000đ",
    date: "31 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80"
  },
  {
    id: "mus-4",
    title: '"SAY HI" PLAYHITS - Live Concert, thuộc Vũ Trụ "Say Hi"',
    price: "800.000đ",
    date: "13 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80"
  }
];

export const STAGE_EVENTS: EventItem[] = [
  {
    id: "stg-1",
    title: "Chào Show - The Sound of Vietnam",
    price: "1.300.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80"
  },
  {
    id: "stg-2",
    title: "Nhà Hát Kịch IDECAF: THUỐC ĐẮNG GIÃ TẬT",
    price: "300.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80"
  },
  {
    id: "stg-3",
    title: 'ART WORKSHOP "UJI MATCHA CHEESECAKE TARTE"',
    price: "420.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&q=80"
  },
  {
    id: "stg-4",
    title: "Sân Khấu Hồng Vân: Vở Kịch Người Vợ Ma",
    price: "300.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&q=80"
  }
];

export const WORKSHOP_EVENTS: EventItem[] = [
  {
    id: "wk-art-1",
    title: 'ART WORKSHOP: HANOI FUSION MOCHI "CỐM"',
    price: "390.000đ",
    date: "31 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80"
  },
  {
    id: "wk-art-2",
    title: 'BAKING WORKSHOP FROM SPECIAL SUMMER ALBUM: "MANGO & EARL GREY"',
    price: "480.000đ",
    date: "30 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80"
  },
  {
    id: "wk-art-3",
    title: '[GARDEN ART] - ART WORKSHOP "TERRARIUM CAKE"',
    price: "379.000đ",
    date: "06 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&q=80"
  },
  {
    id: "wk-art-4",
    title: "[FLOWER 1969'S] ROLLERBALL PERFUME WORKSHOP - TRẢI NGHIỆM LÀM NƯỚC HOA",
    price: "279.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=600&q=80"
  }
];

export const EXPERIENCE_EVENTS: EventItem[] = [
  {
    id: "exp-1",
    title: "OKTOBERFEST VIETNAM 2026",
    price: "1.200.000đ",
    date: "23 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80"
  },
  {
    id: "exp-2",
    title: "Vé Trải Nghiệm GenZania 2 tiếng",
    price: "190.000đ",
    date: "10 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80"
  },
  {
    id: "exp-3",
    title: "Ngắm nhìn bầu trời đêm tuyệt đẹp cùng Đài thiên văn Nha Trang",
    price: "139.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80"
  },
  {
    id: "exp-4",
    title: "VinWonders Nha Trang",
    price: "550.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80"
  }
];

export const SPORTS_EVENTS: EventItem[] = [
  {
    id: "spt-1",
    title: "Trải nghiệm bay dù lượn tại Sapa",
    price: "2.190.000đ",
    date: "01 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1508672019048-805479767389?w=600&q=80"
  },
  {
    id: "spt-2",
    title: "[LEMLAB] Workshop TRẢI NGHIỆM LÀM GỐM",
    price: "400.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80"
  },
  {
    id: "spt-3",
    title: "[FLOWER 1969'S] LUNG TUNG DRUM - TRANG TRÍ TRỐNG LÙNG TÙNG",
    price: "266.000đ",
    date: "29 tháng 08, 2026",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80"
  },
  {
    id: "spt-4",
    title: "ĐẤU TRƯỜNG HỖN CHIẾN MÙA 3",
    price: "699.000đ",
    date: "12 tháng 09, 2026",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80"
  }
];

export const DESTINATIONS: DestinationItem[] = [
  {
    id: "dest-1",
    name: "Tp. Hồ Chí Minh",
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80",
    count: 142
  },
  {
    id: "dest-2",
    name: "Hà Nội",
    image: "https://images.unsplash.com/photo-1509030450996-93f2e3d84074?w=600&q=80",
    count: 98
  },
  {
    id: "dest-3",
    name: "Đà Lạt",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
    count: 45
  },
  {
    id: "dest-4",
    name: "Vị trí khác",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    count: 67
  }
];

export interface TicketTier {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  available: boolean;
  statusText?: string;
}

export interface Showtime {
  id: string;
  dateStr: string;
  timeStr: string;
  fullDateTime: string;
  tickets: TicketTier[];
  isOpen: boolean;
  dayNumber: number; // e.g. 25, 26, 27
  monthNumber: number; // e.g. 9
  yearNumber: number; // e.g. 2026
}

export interface EventDetailData {
  id: string;
  title: string;
  locationName: string;
  address: string;
  minPrice: string;
  posterImage: string;
  datesSummary: string;
  extraDaysCount: number;
  author: string;
  director: string;
  cast: string[];
  descriptionText: string;
  galleryImages: string[];
  showtimes: Showtime[];
  organizer: {
    name: string;
    avatar: string;
    description?: string;
  };
}

export const MOCK_EVENT_DETAIL: EventDetailData = {
  id: "nxnx37-hoc-vien-phep-thuat",
  title: "Nhà Hát Kịch IDECAF: NXNX37 - Học Viện Phép Thuật",
  locationName: "Nhà Hát Bến Thành",
  address: "Số 06 Mạc Đĩnh Chi, Phường Sài Gòn, Thành phố Hồ Chí Minh",
  minPrice: "250.000 đ",
  posterImage: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1000&q=80",
  datesSummary: "20:00, 25 Tháng 09, 2026 - 23:00, 27 Tháng 09, 2026",
  extraDaysCount: 5,
  author: "Quang Thảo",
  director: "Đình Toàn",
  cast: [
    "Bạch Long", "Thanh Thuỷ", "Hoàng Trinh", "Đình Toàn", "Đại Nghĩa",
    "Mỹ Duyên", "Hồng Ánh", "Quang Thảo", "Quốc Thịnh", "Trịnh Minh Dũng",
    "Tuyền Mập", "Tâm Anh", "Cẩm Hò", "Mai Phượng", "Quốc Tuấn", "Thiên Trang",
    "Trung Tín", "Kan Lê", "Quách Bình", "Bảo Cường", "Trà Ngọc", "Đông Hải",
    "Việt Trang", "Phạm Hạnh", "Hoài Trang", "Kim Thanh và Nhà Hát Thiếu Nhi Nụ Cười."
  ],
  descriptionText: `Chương trình Ngày Xửa Ngày Xưa 37 [NXNX37]\n-- HỌC VIỆN PHÉP THUẬT --\n\nVở kịch thiếu nhi hoành tráng được đầu tư công phu với bối cảnh Học Viện Phép Thuật huyền bí. Những cuộc phiêu lưu nghẹt thở, các phép thuật thần kỳ cùng dàn diễn viên gạo cội sẽ mang tới cho quý khán giả những giây phút thư giãn tuyệt vời nhất.`,
  galleryImages: [
    "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80",
    "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"
  ],
  organizer: {
    name: "Nhà Hát Kịch IDECAF",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    description: "Nhà Hát Kịch IDECAF - Sân khấu kịch nổi tiếng hàng đầu tại TP.HCM"
  },
  showtimes: [
    {
      id: "st-1",
      dateStr: "25 Tháng 09, 2026",
      timeStr: "20:00 - 23:00",
      fullDateTime: "20:00 - 23:00, 25 Tháng 09, 2026",
      dayNumber: 25,
      monthNumber: 9,
      yearNumber: 2026,
      isOpen: true,
      tickets: [
        { id: "t1-1", name: "VVIP", price: "400.000 đ", priceValue: 400000, available: true },
        { id: "t1-2", name: "VIP", price: "350.000 đ", priceValue: 350000, available: true },
        { id: "t1-3", name: "THƯỜNG", price: "300.000 đ", priceValue: 300000, available: true },
        { id: "t1-4", name: "LẦU", price: "250.000 đ", priceValue: 250000, available: false, statusText: "Vé chưa mở bán" }
      ]
    },
    {
      id: "st-2",
      dateStr: "26 Tháng 09, 2026",
      timeStr: "16:00 - 19:00",
      fullDateTime: "16:00 - 19:00, 26 Tháng 09, 2026",
      dayNumber: 26,
      monthNumber: 9,
      yearNumber: 2026,
      isOpen: true,
      tickets: [
        { id: "t2-1", name: "VVIP", price: "400.000 đ", priceValue: 400000, available: true },
        { id: "t2-2", name: "VIP", price: "350.000 đ", priceValue: 350000, available: true },
        { id: "t2-3", name: "THƯỜNG", price: "300.000 đ", priceValue: 300000, available: true }
      ]
    },
    {
      id: "st-3",
      dateStr: "26 Tháng 09, 2026",
      timeStr: "20:00 - 23:00",
      fullDateTime: "20:00 - 23:00, 26 Tháng 09, 2026",
      dayNumber: 26,
      monthNumber: 9,
      yearNumber: 2026,
      isOpen: true,
      tickets: [
        { id: "t3-1", name: "VVIP", price: "400.000 đ", priceValue: 400000, available: true },
        { id: "t3-2", name: "VIP", price: "350.000 đ", priceValue: 350000, available: true }
      ]
    },
    {
      id: "st-4",
      dateStr: "27 Tháng 09, 2026",
      timeStr: "09:30 - 12:30",
      fullDateTime: "09:30 - 12:30, 27 Tháng 09, 2026",
      dayNumber: 27,
      monthNumber: 9,
      yearNumber: 2026,
      isOpen: true,
      tickets: [
        { id: "t4-1", name: "VVIP", price: "400.000 đ", priceValue: 400000, available: true },
        { id: "t4-2", name: "THƯỜNG", price: "300.000 đ", priceValue: 300000, available: true }
      ]
    },
    {
      id: "st-5",
      dateStr: "27 Tháng 09, 2026",
      timeStr: "16:00 - 19:00",
      fullDateTime: "16:00 - 19:00, 27 Tháng 09, 2026",
      dayNumber: 27,
      monthNumber: 9,
      yearNumber: 2026,
      isOpen: true,
      tickets: [
        { id: "t5-1", name: "VIP", price: "350.000 đ", priceValue: 350000, available: true }
      ]
    },
    {
      id: "st-6",
      dateStr: "27 Tháng 09, 2026",
      timeStr: "20:00 - 23:00",
      fullDateTime: "20:00 - 23:00, 27 Tháng 09, 2026",
      dayNumber: 27,
      monthNumber: 9,
      yearNumber: 2026,
      isOpen: true,
      tickets: [
        { id: "t6-1", name: "VVIP", price: "400.000 đ", priceValue: 400000, available: true }
      ]
    }
  ]
};

