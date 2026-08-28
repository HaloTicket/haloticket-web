export const PATHS = {
  HOME: "/",
  EVENTS: "/events",
  EVENT_DETAIL: (id: string | number) => `/events/${id}`,
  SELECT_TICKET: (id: string | number) => `/events/${id}/select-ticket`,
  LOGIN: "/login",
  REGISTER: "/register",
  CHECKOUT: "/checkout",
  BOOKING_SUCCESS: "/booking-success",
  MY_TICKETS: "/my-tickets",
  TICKET_DETAIL: (id: string | number) => `/my-tickets/${id}`,
  PROFILE: "/profile",
  NOT_FOUND: "*",
};
