import { createBrowserRouter, Navigate } from "react-router-dom";
import { PATHS } from "./paths";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import OrganizerLayout from "@/layouts/OrganizerLayout";
import AdminLayout from "@/layouts/AdminLayout";

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

// Admin Feature
import AdminDashboard from "@/features/admin/AdminDashboard";
import EventApproval from "@/features/admin/EventApproval";
import EkycApproval from "@/features/admin/EkycApproval";
import ResaleManagement from "@/features/admin/ResaleManagement";
import UserManagement from "@/features/admin/UserManagement";
import CategoryConfig from "@/features/admin/CategoryConfig";
import PaymentMonitoring from "@/features/admin/PaymentMonitoring";
import SystemHealth from "@/features/admin/SystemHealth";
import HomepageConfig from "@/features/admin/HomepageConfig";

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

  // Admin Portal Routes (Separate Admin Layout)
  {
    element: <AdminLayout />,
    children: [
      {
        path: PATHS.ADMIN,
        element: <Navigate to={PATHS.ADMIN_DASHBOARD} replace />,
      },
      {
        path: PATHS.ADMIN_DASHBOARD,
        element: <AdminDashboard />,
      },
      {
        path: PATHS.ADMIN_EVENTS_APPROVAL,
        element: <EventApproval />,
      },
      {
        path: PATHS.ADMIN_EKYC_APPROVAL,
        element: <EkycApproval />,
      },
      {
        path: PATHS.ADMIN_RESALE_PRICE_CAP,
        element: <ResaleManagement />,
      },
      {
        path: PATHS.ADMIN_USERS_PERMISSIONS,
        element: <UserManagement />,
      },
      {
        path: PATHS.ADMIN_CATEGORIES_CONFIG,
        element: <CategoryConfig />,
      },
      {
        path: PATHS.ADMIN_PAYMENTS_MONITORING,
        element: <PaymentMonitoring />,
      },
      {
        path: PATHS.ADMIN_SYSTEM_HEALTH,
        element: <SystemHealth />,
      },
      {
        path: PATHS.ADMIN_HOMEPAGE_CONFIG,
        element: <HomepageConfig />,
      },
    ],
  },
]);
