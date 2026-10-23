export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:8888/api",
  TIMEOUT: 60000,
  // Must match booking-service BOOKING_GA_RESERVATION_ENABLED. On: general-admission tickets are sent as
  // quantities (no virtual -STT- seats) and the backend holds the stock.
  GA_RESERVATION_ENABLED: import.meta.env.VITE_GA_RESERVATION_ENABLED === "true",
};
