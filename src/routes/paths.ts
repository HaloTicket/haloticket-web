export const PATHS = {
  HOME: "/",
  EVENTS: "/events",
  SEARCH: "/search",
  /** Đường dẫn trang chi tiết sự kiện theo mã sự kiện. */
  EVENT_DETAIL: (id: string | number) => `/events/${id}`,
  /** Đường dẫn bước chọn vé của một sự kiện. */
  SELECT_TICKET: (id: string | number) => `/events/${id}/select-ticket`,
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  CHECKOUT: "/checkout",
  BOOKING_SUCCESS: "/booking-success",
  MY_TICKETS: "/profile?tab=tickets",
  /** Đường dẫn chi tiết đơn hàng theo mã đơn. */
  ORDER_DETAIL: (orderCode: string | number) => `/my-tickets/orders/${orderCode}`,
  GIFT_ACCEPT: "/gifts/accept",
  EVENT_INVITATION_ACCEPT: "/event-invitations/accept",
  RESALE: "/resale-ticket",
  MARKETPLACE: "/resale-ticket",
  /** Đường dẫn chi tiết một vé của người dùng. */
  TICKET_DETAIL: (id: string | number) => `/my-tickets/${id}`,
  PROFILE: "/profile",
  EKYC: "/ekyc",
  ORGANIZER: "/organizer",
  MY_EVENTS: "/organizer/my-events",
  FINANCE: "/organizer/finance",
  /** Đường dẫn chi tiết một yêu cầu rút tiền của nhà tổ chức. */
  FINANCE_WITHDRAWAL: (id: string | number) => `/organizer/finance/withdrawals/${id}`,
  REPORTS: "/organizer/finance?tab=reports",
  TERMS: "/organizer/terms",
  CREATE_EVENT: "/organizer/create-event",
  /** Đường dẫn gốc cổng quản lý của một sự kiện. */
  EVENT_MANAGE: (id: string | number) => `/organizer/events/${id}/manage`,
  /** Đường dẫn tab tổng quan trong cổng quản lý sự kiện. */
  EVENT_MANAGE_OVERVIEW: (id: string | number) => `/organizer/events/${id}/manage/overview`,
  /** Đường dẫn tab đơn hàng trong cổng quản lý sự kiện. */
  EVENT_MANAGE_ORDERS: (id: string | number) => `/organizer/events/${id}/manage/orders`,
  /** Đường dẫn tab check-in trong cổng quản lý sự kiện. */
  EVENT_MANAGE_CHECKIN: (id: string | number) => `/organizer/events/${id}/manage/checkin`,
  /** Đường dẫn tab thành viên trong cổng quản lý sự kiện. */
  EVENT_MANAGE_MEMBERS: (id: string | number) => `/organizer/events/${id}/manage/members`,
  /** Đường dẫn tab voucher trong cổng quản lý sự kiện. */
  EVENT_MANAGE_VOUCHERS: (id: string | number) => `/organizer/events/${id}/manage/vouchers`,
  /** Đường dẫn tab sơ đồ chỗ ngồi trong cổng quản lý sự kiện. */
  EVENT_MANAGE_SEATING: (id: string | number) => `/organizer/events/${id}/manage/seating`,
  /** Đường dẫn tab gán vé trong cổng quản lý sự kiện. */
  EVENT_MANAGE_TICKET_ASSIGN: (id: string | number) => `/organizer/events/${id}/manage/ticket-assign`,
  /** Đường dẫn trang chỉnh sửa sự kiện trong cổng quản lý. */
  EVENT_MANAGE_EDIT: (id: string | number) => `/organizer/events/${id}/manage/edit`,
  /** Đường dẫn tab chuyển nhượng vé (bán lại, tặng) trong cổng quản lý sự kiện. */
  EVENT_MANAGE_TRANSFERS: (id: string | number) => `/organizer/events/${id}/manage/transfers`,
  ADMIN: "/admin",
  ADMIN_NOTIFICATIONS: "/admin/notifications",
  ADMIN_SETTINGS: "/admin/settings",
  ADMIN_IDENTITY_VERIFICATION: "/admin/identity-verification",
  /** Đường dẫn một mục trong phần cài đặt quản trị, theo tên mục. */
  ADMIN_SETTINGS_SECTION: (section: string) => `/admin/settings/${section}`,
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_EVENT_MANAGEMENT: "/admin/events",
  ADMIN_EVENT_REPORTS: "/admin/events/reports",
  /** Đường dẫn báo cáo chi tiết của một sự kiện trong khu quản trị; mã được mã hóa URL. */
  ADMIN_EVENT_REPORT_DETAIL: (id: string) => `/admin/events/reports/${encodeURIComponent(id)}`,
  ADMIN_USER_MANAGEMENT: "/admin/users",
  ADMIN_CUSTOMERS: "/admin/users/customers",
  ADMIN_ORGANIZERS: "/admin/users/organizers",
  ADMIN_ADMINISTRATORS: "/admin/users/administrators",
  ADMIN_FINANCE: "/admin/finance",
  ADMIN_RECONCILIATION: "/admin/reconciliation",
  ADMIN_PAYMENT_TRANSACTIONS: "/admin/finance/payments",
  ADMIN_REFUNDS: "/admin/finance/refunds",
  ADMIN_ORGANIZER_SETTLEMENTS: "/admin/finance/settlements",
  ADMIN_TICKET_MARKET: "/admin/market",
  ADMIN_RESALE_TICKETS: "/admin/market/resale",
  ADMIN_PRICE_POLICY: "/admin/market/price-policy",
  ADMIN_TRANSACTION_DISPUTES: "/admin/market/disputes",
  ADMIN_CONTENT: "/admin/content",
  ADMIN_HOMEPAGE_CONTENT: "/admin/content/homepage",
  ADMIN_EVENT_CATEGORIES: "/admin/content/categories",
  ADMIN_ADVERTISING_BANNERS: "/admin/content/banners",
  ADMIN_AI: "/admin/ai",
  ADMIN_AI_ASSISTANT: "/admin/ai/assistant",
  ADMIN_AI_ANOMALIES: "/admin/ai/anomalies",
  ADMIN_AI_ANALYTICS: "/admin/ai/analytics",
  ADMIN_AI_SUMMARY: "/admin/ai/summary",
  ADMIN_AI_RISK: "/admin/ai/risk-assessment",
  ADMIN_SYSTEM_SETTINGS: "/admin/system-settings",
  ADMIN_EVENTS_APPROVAL: "/admin/events-approval",
  /** Đường dẫn trang duyệt chi tiết một sự kiện; mã được mã hóa URL. */
  ADMIN_EVENT_APPROVAL_DETAIL: (id: string | number) => `/admin/events-approval/${encodeURIComponent(String(id))}`,
  ADMIN_EKYC_APPROVAL: "/admin/ekyc-approval",
  ADMIN_SYSTEM_MONITORING: "/admin/monitoring",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  ADMIN_USERS_PERMISSIONS: "/admin/users-permissions",
  ADMIN_CATEGORIES_CONFIG: "/admin/categories-config",
  ADMIN_PAYMENTS_MONITORING: "/admin/payments-monitoring",
  ADMIN_SYSTEM_HEALTH: "/admin/system-health",
  ADMIN_HOMEPAGE_CONFIG: "/admin/homepage-config",
  ADMIN_VENUES_MANAGEMENT: "/admin/venues",
  /** Đường dẫn trình chỉnh sơ đồ chỗ ngồi của một địa điểm. */
  ADMIN_VENUE_SEATMAP: (id: string | number) => `/admin/venues/${id}/seatmap`,
  PAYMENT_CALLBACK: "/payment/callback",
  NOT_FOUND: "*",
};
