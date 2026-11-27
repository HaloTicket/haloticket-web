export const notificationPriorities = {
  NORMAL: {
    label: "Thông thường",
    description: "Cập nhật chung từ HaloTicket",
    tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  IMPORTANT: {
    label: "Quan trọng",
    description: "Ưu tiên cao cho cập nhật cần chú ý",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  URGENT: {
    label: "Khẩn cấp",
    description: "Thông tin cần được chú ý ngay",
    tone: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  },
} as const;
