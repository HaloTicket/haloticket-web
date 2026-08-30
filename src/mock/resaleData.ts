export interface ResaleSeatItem {
  id: string;
  section: string; // e.g. "XOAY-TRON-A2"
  seatRow: string; // e.g. "C - 16"
  price: string; // e.g. "2.499.000đ"
  priceValue: number;
  isSelected: boolean;
}

export interface ResaleTicketListing {
  id: string;
  eventId: string;
  resaleCode: string; // e.g. "RSL461904575"
  isRetail: boolean; // true = "Bán lẻ", false = "Không bán lẻ"
  quantity: number;
  showtimeStr: string; // e.g. "19:00, 06 tháng 09, 2026"
  tierName: string; // e.g. "XOAY TRÒN A2 (SEATED)"
  areaName: string; // e.g. "XOAY-TRON-A2"
  tierColor?: string; // Color set by organizer for tier dot
  pricePerTicket: string; // e.g. "2.499.000đ"
  priceValue: number;
  seats: ResaleSeatItem[];
}

export interface ResaleEvent {
  id: string;
  title: string;
  organizer: string;
  venueName: string;
  address: string;
  datesSummary: string;
  posterImage: string;
  isEnded?: boolean;
  statusBadge?: string;
  availableListingsCount: number;
  minPrice: string;
  listings: ResaleTicketListing[];
}

export const MOCK_RESALE_EVENTS: ResaleEvent[] = [
  {
    id: "xoay-tron-concert-hoang-dung",
    title: "Xoay Tròn Concert - Hoàng Dũng",
    organizer: "Hoàng Dũng Entertainment",
    venueName: "VINHOMES OCEAN PARK 3",
    address: "Vinhomes Ocean Park 3, Xã Văn Giang, Tỉnh Hưng Yên",
    datesSummary: "19:00, 06 Tháng 09, 2026",
    posterImage: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1000&q=80",
    statusBadge: "Đang diễn ra",
    availableListingsCount: 12,
    minPrice: "1.399.000đ",
    listings: [
      {
        id: "rsl-1",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL461904575",
        isRetail: true,
        quantity: 2,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY TRÒN A2 (SEATED)",
        areaName: "XOAY-TRON-A2",
        tierColor: "#06B6D4",
        pricePerTicket: "2.499.000đ",
        priceValue: 2499000,
        seats: [
          { id: "s1", section: "XOAY-TRON-A2", seatRow: "C - 16", price: "2.499.000đ", priceValue: 2499000, isSelected: true },
          { id: "s2", section: "XOAY-TRON-A2", seatRow: "C - 17", price: "2.499.000đ", priceValue: 2499000, isSelected: false }
        ]
      },
      {
        id: "rsl-2",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL098398269",
        isRetail: true,
        quantity: 2,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY ĐỀU B (STANDING)",
        areaName: "XOAY-DEU-B",
        tierColor: "#F59E0B",
        pricePerTicket: "1.700.000đ",
        priceValue: 1700000,
        seats: [
          { id: "s3", section: "XOAY-DEU-B", seatRow: "Standing 101", price: "1.700.000đ", priceValue: 1700000, isSelected: true },
          { id: "s4", section: "XOAY-DEU-B", seatRow: "Standing 102", price: "1.700.000đ", priceValue: 1700000, isSelected: true }
        ]
      },
      {
        id: "rsl-3",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL469481575",
        isRetail: true,
        quantity: 1,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY TRÒN B1 (SEATED)",
        areaName: "XOAY-TRON-B1",
        tierColor: "#F43F5E",
        pricePerTicket: "2.499.000đ",
        priceValue: 2499000,
        seats: [
          { id: "s5", section: "XOAY-TRON-B1", seatRow: "D - 05", price: "2.499.000đ", priceValue: 2499000, isSelected: true }
        ]
      },
      {
        id: "rsl-4",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL389639474",
        isRetail: false,
        quantity: 2,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY TRÒN A2 (SEATED)",
        areaName: "XOAY-TRON-A2",
        tierColor: "#06B6D4",
        pricePerTicket: "2.499.000đ",
        priceValue: 2499000,
        seats: [
          { id: "s6", section: "XOAY-TRON-A2", seatRow: "E - 08", price: "2.499.000đ", priceValue: 2499000, isSelected: true },
          { id: "s7", section: "XOAY-TRON-A2", seatRow: "E - 09", price: "2.499.000đ", priceValue: 2499000, isSelected: true }
        ]
      },
      {
        id: "rsl-5",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL642565714",
        isRetail: true,
        quantity: 1,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY ĐỀU A (STANDING)",
        areaName: "XOAY-DEU-A",
        tierColor: "#10B981",
        pricePerTicket: "1.700.000đ",
        priceValue: 1700000,
        seats: [
          { id: "s8", section: "XOAY-DEU-A", seatRow: "Standing 55", price: "1.700.000đ", priceValue: 1700000, isSelected: true }
        ]
      },
      {
        id: "rsl-6",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL127291397",
        isRetail: true,
        quantity: 1,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY ĐỀU B (STANDING)",
        areaName: "XOAY-DEU-B",
        tierColor: "#F59E0B",
        pricePerTicket: "1.399.000đ",
        priceValue: 1399000,
        seats: [
          { id: "s9", section: "XOAY-DEU-B", seatRow: "Standing 210", price: "1.399.000đ", priceValue: 1399000, isSelected: true }
        ]
      },
      {
        id: "rsl-7",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL758071945",
        isRetail: false,
        quantity: 2,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY ĐỀU B (STANDING)",
        areaName: "XOAY-DEU-B",
        tierColor: "#F59E0B",
        pricePerTicket: "1.800.000đ",
        priceValue: 1800000,
        seats: [
          { id: "s10", section: "XOAY-DEU-B", seatRow: "Standing 301", price: "1.800.000đ", priceValue: 1800000, isSelected: true },
          { id: "s11", section: "XOAY-DEU-B", seatRow: "Standing 302", price: "1.800.000đ", priceValue: 1800000, isSelected: true }
        ]
      },
      {
        id: "rsl-8",
        eventId: "xoay-tron-concert-hoang-dung",
        resaleCode: "RSL127844397",
        isRetail: true,
        quantity: 2,
        showtimeStr: "19:00, 06 tháng 09, 2026",
        tierName: "XOAY ĐỀU B (STANDING)",
        areaName: "XOAY-DEU-B",
        tierColor: "#F59E0B",
        pricePerTicket: "1.399.000đ",
        priceValue: 1399000,
        seats: [
          { id: "s12", section: "XOAY-DEU-B", seatRow: "Standing 412", price: "1.399.000đ", priceValue: 1399000, isSelected: true },
          { id: "s13", section: "XOAY-DEU-B", seatRow: "Standing 413", price: "1.399.000đ", priceValue: 1399000, isSelected: true }
        ]
      }
    ]
  },
  {
    id: "nxnx37-hoc-vien-phep-thuat",
    title: "Nhà Hát Kịch IDECAF: NXNX37 - Học Viện Phép Thuật",
    organizer: "Nhà Hát Kịch IDECAF",
    venueName: "Nhà Hát Bến Thành",
    address: "Số 06 Mạc Đĩnh Chi, Phường Sài Gòn, Thành phố Hồ Chí Minh",
    datesSummary: "25 tháng 09, 2026",
    posterImage: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1000&q=80",
    availableListingsCount: 8,
    minPrice: "250.000đ",
    listings: []
  },
  {
    id: "idecaf-mot-ngay-lam-vua",
    title: "Nhà Hát Kịch IDECAF: Một Ngày Làm VUA",
    organizer: "Nhà Hát Kịch IDECAF",
    venueName: "Nhà Hát Bến Thành",
    address: "Số 06 Mạc Đĩnh Chi, Phường Sài Gòn, Thành phố Hồ Chí Minh",
    datesSummary: "06 tháng 09, 2026",
    posterImage: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80",
    availableListingsCount: 5,
    minPrice: "300.000đ",
    listings: []
  },
  {
    id: "idecaf-tam-cam-dai-chien",
    title: "Nhà Hát Kịch IDECAF: TẤM CÁM ĐẠI CHIẾN!",
    organizer: "Nhà Hát Kịch IDECAF",
    venueName: "Nhà Hát Bến Thành",
    address: "Số 06 Mạc Đĩnh Chi, Phường Sài Gòn, Thành phố Hồ Chí Minh",
    datesSummary: "03 tháng 09, 2026",
    posterImage: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
    availableListingsCount: 6,
    minPrice: "350.000đ",
    listings: []
  },
  {
    id: "phung-khanh-linh-tour",
    title: "GIỮA MỘT VẠN TOUR (MỞ RỘNG) - PHÙNG KHÁNH LINH | CHAPTER 5",
    organizer: "Hãng Đĩa Thời Đại",
    venueName: "Nhà Thi Đấu Nguyễn Du",
    address: "116 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM",
    datesSummary: "17 tháng 10, 2026",
    posterImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    availableListingsCount: 14,
    minPrice: "600.000đ",
    listings: []
  },
  {
    id: "ngoc-thanh-tam-fan-meeting",
    title: "NGỌC THANH TÂM'S BIRTHDAY FAN MEETING",
    organizer: "Nghệ sĩ Ngọc Thanh Tâm",
    venueName: "Nhà Thi Đấu Phan Đình Phùng",
    address: "8 Pasteur, Phường 6, Quận 3, TP.HCM",
    datesSummary: "19 tháng 07, 2026",
    posterImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80",
    statusBadge: "Đã diễn ra",
    isEnded: true,
    availableListingsCount: 0,
    minPrice: "400.000đ",
    listings: []
  },
  {
    id: "mat-nham-mat-mo-concert",
    title: "MẮT NHẮM MẮT MỞ CONCERT",
    organizer: "Mắt Nhắm Mắt Mở Production",
    venueName: "Nhà Thi Đấu Phú Thọ",
    address: "Lý Thường Kiệt, Quận 11, TP.HCM",
    datesSummary: "01 tháng 08, 2026",
    posterImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
    statusBadge: "Đã diễn ra",
    isEnded: true,
    availableListingsCount: 0,
    minPrice: "500.000đ",
    listings: []
  },
  {
    id: "jane-yeh-birthday-tour",
    title: "JANE YEH BIRTHDAY TOUR 2026",
    organizer: "Jane Yeh Official",
    venueName: "Nhà Thi Đấu Quân Khu 7",
    address: "Hoàng Văn Thụ, Tân Bình, TP.HCM",
    datesSummary: "18 tháng 07, 2026",
    posterImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
    statusBadge: "Đã diễn ra",
    isEnded: true,
    availableListingsCount: 0,
    minPrice: "450.000đ",
    listings: []
  }
];
