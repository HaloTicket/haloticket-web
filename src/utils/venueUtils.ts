export interface SystemVenue {
  id: string;
  name: string;
  city: string;
  ward: string;
  address: string;
  capacity: number;
  verified: boolean;
  eventsHosted: number;
  bookings: {
    eventName: string;
    organizer: string;
    date: string;
    timeSlot: string;
    status: "CONFIRMED" | "PENDING";
  }[];
}

export const PRESET_VENUES: SystemVenue[] = [
  {
    id: "v-1",
    name: "Sân vận động Quốc gia Mỹ Đình",
    city: "Hà Nội",
    ward: "Phường Mỹ Đình 1",
    address: "1 Đường Lê Đức Thọ, Nam Từ Liêm",
    capacity: 40000,
    verified: true,
    eventsHosted: 18,
    bookings: [
      { eventName: "Concert Anh Trai Say Hi 2026", organizer: "Vie Channel", date: "2026-10-15", timeSlot: "18:00 - 23:00", status: "CONFIRMED" },
      { eventName: "Grand Music Festival", organizer: "SoundVibe Entertainment", date: "2026-11-20", timeSlot: "17:00 - 23:00", status: "CONFIRMED" }
    ]
  },
  {
    id: "v-2",
    name: "Nhà hát Hòa Bình",
    city: "TP. Hồ Chí Minh",
    ward: "Phường 12",
    address: "240 Đường 3 Tháng 2, Quận 10",
    capacity: 2500,
    verified: true,
    eventsHosted: 35,
    bookings: [
      { eventName: "Liveshow Đêm Nhạc Trịnh", organizer: "Gia Định Audio", date: "2026-09-30", timeSlot: "19:30 - 22:30", status: "CONFIRMED" }
    ]
  },
  {
    id: "v-3",
    name: "Nhà thi đấu Phú Thọ",
    city: "TP. Hồ Chí Minh",
    ward: "Phường 15",
    address: "1 Lý Thường Kiệt, Quận 11",
    capacity: 5000,
    verified: true,
    eventsHosted: 24,
    bookings: []
  },
  {
    id: "v-4",
    name: "Trung tâm Hội nghị Quốc gia NCC",
    city: "Hà Nội",
    ward: "Phường Mễ Trì",
    address: "Đại lộ Thăng Long, Nam Từ Liêm",
    capacity: 3800,
    verified: true,
    eventsHosted: 42,
    bookings: [
      { eventName: "Vietnam Tech Summit 2026", organizer: "VNG Group", date: "2026-10-05", timeSlot: "08:00 - 17:00", status: "CONFIRMED" }
    ]
  },
  {
    id: "v-5",
    name: "Phim trường Chill Town",
    city: "TP. Hồ Chí Minh",
    ward: "Phường Tân Phú",
    address: "Số 8 Đường 27, Quận 7",
    capacity: 1200,
    verified: false,
    eventsHosted: 8,
    bookings: []
  },
  {
    id: "v-6",
    name: "Công viên 23 Tháng 9 (Khu A)",
    city: "TP. Hồ Chí Minh",
    ward: "Phường Phạm Ngũ Lão",
    address: "Đường Phạm Ngũ Lão, Quận 1",
    capacity: 8000,
    verified: true,
    eventsHosted: 12,
    bookings: []
  },
  {
    id: "v-7",
    name: "Cung Thể thao Tuyên Sơn",
    city: "Đà Nẵng",
    ward: "Phường Hòa Cường Bắc",
    address: "Phan Đăng Lưu, Hải Châu",
    capacity: 7000,
    verified: true,
    eventsHosted: 15,
    bookings: []
  }
];
