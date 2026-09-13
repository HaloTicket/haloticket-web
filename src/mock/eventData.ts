import type {
  EventItem,
  ArtistItem,
  HeroBannerItem,
  DestinationItem,
  TicketTier,
  Showtime,
  EventDetailData,
} from "@/types";

export type {
  EventItem,
  ArtistItem,
  HeroBannerItem,
  DestinationItem,
  TicketTier,
  Showtime,
  EventDetailData,
};

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "hero-1",
    title: "Hero Event 1",
    date: "2026",
    location: "HaloTicket",
    image: "https://images.tkbcdn.com/2/614/350/ts/ds/96/8e/f7/8d2ebdfa2947ec1cbbcebece74df891b.jpg",
    link: "/events/hero-1",
    badge: "NỔI BẬT"
  },
  {
    id: "hero-2",
    title: "Hero Event 2",
    date: "2026",
    location: "HaloTicket",
    image: "https://images.tkbcdn.com/2/614/350/ts/ds/64/ec/f7/1774645017a670715ea14aba00cf7130.jpg",
    link: "/events/hero-2",
    badge: "ĐANG BÁN"
  }
];

export const FEATURED_STARS: ArtistItem[] = [
  {
    id: "star-1",
    name: "SS Label",
    avatar: "https://salt.tkbcdn.com/ts/ds/80/44/52/f143ddd06c30a353f9830f2886fab35f.jpg",
    verified: true
  },
  {
    id: "star-2",
    name: "Phùng Khánh Linh",
    avatar: "https://salt.tkbcdn.com/ts/ds/c8/8d/2a/7bff570aac6a5b8da3e3978be0a10523.jpeg",
    verified: true
  },
  {
    id: "star-3",
    name: "Jun Phạm",
    avatar: "https://salt.tkbcdn.com/ts/ds/6c/9c/c6/9795b95561c2cdb5f6a26d54ddd4d294.jpg",
    verified: true
  },
  {
    id: "star-4",
    name: "Cheng",
    avatar: "https://salt.tkbcdn.com/ts/ds/1c/bb/f5/aabba9b832b261727956df145404e1a6.jpg",
    verified: true
  },
  {
    id: "star-5",
    name: "Subicha",
    avatar: "https://salt.tkbcdn.com/ts/ds/7f/b1/ef/3928ba728b71eda9dca2055579ad6719.png",
    verified: true
  },
  {
    id: "star-6",
    name: "Hoàng Dũng",
    avatar: "https://salt.tkbcdn.com/ts/ds/fc/0d/ba/620818361469476b1d42ee28c522860b.jpg",
    verified: true
  },
  {
    id: "star-7",
    name: "Mr. Siro",
    avatar: "https://salt.tkbcdn.com/ts/ds/80/26/5d/da7a92d2420ce878abe7501dee0decd4.jpeg",
    verified: true
  },
  {
    id: "star-8",
    name: "Nguyễn Văn Chung",
    avatar: "https://salt.tkbcdn.com/ts/ds/17/41/14/6767ba2534c92c7b47e93624d33442f6.png",
    verified: true
  }
];

export const SPECIAL_EVENTS: EventItem[] = [
  {
    id: "spec-1",
    title: "Sự kiện đặc biệt 1",
    price: "599.000đ",
    date: "19 tháng 09, 2026",
    image: "https://images.tkbcdn.com/2/360/479/ts/ds/41/16/76/654b77bfcee9d4b57987dd0c9d9b8e38.jpg",
    category: "Concert",
    isHot: true
  },
  {
    id: "spec-2",
    title: "Sự kiện đặc biệt 2",
    price: "800.000đ",
    date: "20 tháng 10, 2026",
    image: "https://images.tkbcdn.com/2/360/479/ts/ds/3a/01/47/ce9770caf25d827e3d0098c35e502186.jpg",
    category: "Nghệ thuật"
  },
  {
    id: "spec-3",
    title: "Sự kiện đặc biệt 3",
    price: "250.000đ",
    date: "15 tháng 09, 2026",
    image: "https://images.tkbcdn.com/2/360/479/ts/ds/a3/25/24/0f337ee5480452962ce534ab54528873.jpg",
    category: "Sân khấu"
  },
  {
    id: "spec-4",
    title: "Sự kiện đặc biệt 4",
    price: "350.000đ",
    date: "25 tháng 09, 2026",
    image: "https://images.tkbcdn.com/2/360/479/ts/ds/69/43/12/0862b6cf4ce62863aab774588b8b28dc.jpg",
    category: "Hài kịch"
  },
  {
    id: "spec-5",
    title: "Sự kiện đặc biệt 5",
    price: "120.000đ",
    date: "Hằng ngày 2026",
    image: "https://images.tkbcdn.com/2/360/479/ts/ds/eb/aa/bb/9d6a5edc549c2c98c3a090c7c226efe5.jpg",
    category: "Tham quan"
  }
];

export const TRENDING_EVENTS: EventItem[] = [
  {
    id: "trend-1",
    rank: 1,
    title: "Sự kiện xu hướng 1",
    price: "1.200.000đ",
    date: "17 - 18.10.2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/b5/15/da/e6461a9460a6f010e98e8b8ccced9fc5.png",
    location: "Sân vận động Mỹ Đình, Hà Nội"
  },
  {
    id: "trend-2",
    rank: 2,
    title: "Sự kiện xu hướng 2",
    price: "150.000đ",
    date: "13 tháng 09, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/38/ba/bb/0e6970c4c57a2c271efa1b001cdb88da.jpg",
    location: "Cung Thể thao Quần Ngựa, Hà Nội"
  },
  {
    id: "trend-3",
    rank: 3,
    title: "Sự kiện xu hướng 3",
    price: "300.000đ",
    date: "24 - 26.09.2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/b5/74/82/d8011fdc192aa1c655b71f81bb35b016.jpeg",
    location: "CLB Lan Anh, TP.HCM"
  },
  {
    id: "trend-4",
    rank: 4,
    title: "Sự kiện xu hướng 4",
    price: "750.000đ",
    date: "05 tháng 10, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/36/d1/6f/98ed8fedb0a57abd4f33503ff2f3c324.jpg",
    location: "Công viên Yên Sở, Hà Nội"
  }
];

export const WEEKEND_EVENTS: EventItem[] = [
  {
    id: "wk-1",
    title: "[LEMLAB] Workshop TRẢI NGHIỆM LÀM GỐM",
    price: "150.000đ",
    date: "14 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/b6/7d/6b/df1d44d30bf41ae140f6383dfce54c88.jpg"
  },
  {
    id: "wk-2",
    title: "[LEMLAB] Mini Workshop VẼ LY GỐM",
    price: "250.000đ",
    date: "14 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/04/ae/18/9ee650dff5237d8bcfdb2f92aa049e1c.jpg"
  },
  {
    id: "wk-3",
    title: "BAKING WORKSHOP: MANGO & EARL GREY CHIFFON CAKE",
    price: "460.000đ",
    date: "14 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/f8/16/13/704eb8f779bb52bfdeabb990a588755c.jpg"
  },
  {
    id: "wk-4",
    title: "[FLOWER 1969] ROLLERBALL PERFUME WORKSHOP",
    price: "379.000đ",
    date: "14 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/82/66/e4/c197c2255d40eb0940465707418f239c.png"
  }
];

export const RESALE_EVENTS: EventItem[] = [
  {
    id: "res-1",
    title: "Xoay Tròn Concert - Hoàng Dũng",
    price: "Từ 800.000đ",
    date: "14 tháng 08, 2026",
    image: "https://salt.tkbcdn.com/ts/ds/08/4e/17/f9e030d4ab618eab76553bbebe08030c.png",
    isResale: true
  },
  {
    id: "res-2",
    title: "Nhà Hát Kịch IDECAF: TẤM CÁM ĐẠI CHIẾN!",
    price: "Từ 350.000đ",
    date: "15 tháng 08, 2026",
    image: "https://salt.tkbcdn.com/ts/ds/12/c5/75/d09af12e58cebe049ce432dcf109e26b.jpg",
    isResale: true
  }
];

export const MUSIC_EVENTS: EventItem[] = [
  {
    id: "mus-1",
    title: "Giuseppe Ottaviani - APLUS HANOI [MUSEUM OF SOUND]",
    price: "400.000đ",
    date: "16 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/12/29/ca/277480e093794573ad1dac4d5f006a38.png"
  },
  {
    id: "mus-2",
    title: "RESONATE - SOLO PIANO CONCERT",
    price: "900.000đ",
    date: "15 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/d7/d4/1c/17d488d0e88c1471a195609024326daf.png"
  },
  {
    id: "mus-3",
    title: "VOLAR SAIGON PRESENTS CRISTOPH | MELODIC TECHNO",
    price: "850.000đ",
    date: "23 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/ea/69/7e/b9edb328a5a3cc0ba40d66d9253e6c80.jpg"
  },
  {
    id: "mus-4",
    title: "CARROT DAY 2026",
    price: "600.000đ",
    date: "15 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/36/96/87/21a83b95223417e3b005cb71de02c687.jpg"
  }
];

export const STAGE_EVENTS: EventItem[] = [
  {
    id: "stg-1",
    title: "ART WORKSHOP: MOMOFUKU STYLE BASIL RASPBERRY CAKE",
    price: "450.000đ",
    date: "16 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/ee/04/57/30c09e53caaf0abe6a9f1b316818dc68.jpg"
  },
  {
    id: "stg-2",
    title: "SKNT TRƯƠNG HÙNG MINH: HẸN EM RẰM THÁNG 7",
    price: "350.000đ",
    date: "15 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/b1/74/ac/22dc559b56bbec77079390a8d9f89ec8.jpg"
  },
  {
    id: "stg-3",
    title: "Sân Khấu Hồng Vân: Ngôi Nhà Hoang",
    price: "280.000đ",
    date: "17 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/7a/df/41/c361f18cb885b50da5f692c04571dc66.png"
  },
  {
    id: "stg-4",
    title: "ART WORKSHOP: COURONNE DE CHOUX",
    price: "450.000đ",
    date: "18 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/41/ae/69/84c7687705ceafdaa16c2eddb28cd87e.jpg"
  }
];

export const WORKSHOP_EVENTS: EventItem[] = [
  {
    id: "wk-art-1",
    title: "Tipsy Art Painting Workshop - Thử tự tay vẽ một bức tranh",
    price: "520.000đ",
    date: "15 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/28/19/0b/4644748f70853aa321c586d2f90deee5.png"
  },
  {
    id: "wk-art-2",
    title: "Chào Show - The Sound of Vietnam",
    price: "490.000đ",
    date: "20 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/87/79/61/39a5a9fd0f92576d410ccbb0a0317543.jpg"
  },
  {
    id: "wk-art-3",
    title: "Trải nghiệm bay dù lượn tại Sapa",
    price: "1.950.000đ",
    date: "26 tháng 07, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/36/d1/6f/98ed8fedb0a57abd4f33503ff2f3c324.jpg"
  },
  {
    id: "wk-art-4",
    title: "ART WORKSHOP: BLUSH & BERRIES CHARLOTTE",
    price: "450.000đ",
    date: "17 tháng 08, 2026",
    image: "https://images.tkbcdn.com/2/608/332/ts/ds/99/06/33/62c45b644eb852db380370cffb345241.jpg"
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
    image: "https://salt.tkbcdn.com/ts/ds/69/8f/41/3d80536931f8821f24c4a7634793869b.jpg",
    count: 142
  },
  {
    id: "dest-2",
    name: "Hà Nội",
    image: "https://salt.tkbcdn.com/ts/ds/42/87/61/3995bf7edc9a5fbd3a16526a11970315.jpg",
    count: 98
  },
  {
    id: "dest-3",
    name: "Đà Lạt",
    image: "https://salt.tkbcdn.com/ts/ds/23/a1/e6/3001900cbb6041cb00c7df3dcefe8ed7.png",
    count: 45
  },
  {
    id: "dest-4",
    name: "Vị trí khác",
    image: "https://salt.tkbcdn.com/ts/ds/d8/b7/4e/313ff0caab3c8f518be523da266c0fe7.png",
    count: 67
  }
];

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

