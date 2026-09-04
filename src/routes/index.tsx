import { createBrowserRouter, Navigate } from "react-router-dom";
import { PATHS } from "./paths";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import OrganizerLayout from "@/layouts/OrganizerLayout";

// Events Feature
import Home from "@/features/events/Home";
import EventSearch from "@/features/events/EventSearch";
import EventDetail from "@/features/events/EventDetail";

// Auth Feature
import Login from "@/features/auth/Login";
import Register from "@/features/auth/Register";

// Tickets Feature
import SelectTicket from "@/features/tickets/SelectTicket";
import Checkout from "@/features/tickets/Checkout";
import BookingSuccess from "@/features/tickets/BookingSuccess";
import MyTickets from "@/features/tickets/MyTickets";
import TicketDetail from "@/features/tickets/TicketDetail";

// User Feature
import Profile from "@/features/user/Profile";

// Organizer Feature
import CreateEvent from "@/features/organizer/CreateEvent";
import MyEvents from "@/features/organizer/MyEvents";
import OrganizerReports from "@/features/organizer/OrganizerReports";
import OrganizerTerms from "@/features/organizer/OrganizerTerms";

// Resale Feature
import ResaleList from "@/features/resale/ResaleList";
import ResaleEventDetail from "@/features/resale/ResaleEventDetail";
import ResaleTicketCheckout from "@/features/resale/ResaleTicketCheckout";

// Common / Error
import NotFound from "@/features/common/NotFound";

export const router = createBrowserRouter([
  // Main App Routes (with Main Header & Footer)
  {
    path: PATHS.HOME,
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: PATHS.EVENTS,
        element: <EventSearch />,
      },
      {
        path: PATHS.SEARCH,
        element: <EventSearch />,
      },
      {
        path: "/category/:slug",
        element: <EventSearch />,
      },
      {
        path: "/events/:id",
        element: <EventDetail />,
      },
      {
        path: "/events/:id/select-ticket",
        element: <SelectTicket />,
      },
      {
        path: "/resale-ticket",
        element: <ResaleList />,
      },
      {
        path: "/resale-ticket/:eventId",
        element: <ResaleEventDetail />,
      },
      {
        path: "/resale-ticket/:eventId/ticket/:ticketId",
        element: <ResaleTicketCheckout />,
      },
      {
        path: PATHS.CHECKOUT,
        element: <Checkout />,
      },
      {
        path: PATHS.BOOKING_SUCCESS,
        element: <BookingSuccess />,
      },
      {
        path: PATHS.MY_TICKETS,
        element: <MyTickets />,
      },
      {
        path: "/my-tickets/:id",
        element: <TicketDetail />,
      },
      {
        path: PATHS.PROFILE,
        element: <Profile />,
      },
      {
        path: PATHS.NOT_FOUND,
        element: <NotFound />,
      },
    ],
  },

  // Auth Routes (with Auth Layout)
  {
    element: <AuthLayout />,
    children: [
      {
        path: PATHS.LOGIN,
        element: <Login />,
      },
      {
        path: PATHS.REGISTER,
        element: <Register />,
      },
    ],
  },

  // Organizer Center Routes (Separate Layout WITHOUT Main Header & Footer)
  {
    element: <OrganizerLayout />,
    children: [
      {
        path: PATHS.ORGANIZER,
        element: <Navigate to={PATHS.MY_EVENTS} replace />,
      },
      {
        path: PATHS.MY_EVENTS,
        element: <MyEvents />,
      },
      {
        path: PATHS.REPORTS,
        element: <OrganizerReports />,
      },
      {
        path: PATHS.TERMS,
        element: <OrganizerTerms />,
      },
      {
        path: PATHS.CREATE_EVENT,
        element: <CreateEvent />,
      },
    ],
  },
]);
