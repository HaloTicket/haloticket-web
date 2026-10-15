/* This module intentionally co-locates route definitions and their small auth adapters. */
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, useNavigate } from "react-router-dom";
import { PATHS } from "./paths";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import OrganizerLayout from "@/layouts/OrganizerLayout";
import AdminLayout from "@/layouts/AdminLayout";
import BookingLayout from "@/layouts/BookingLayout";

// Events Feature
import Home from "@/features/events/Home";
import EventSearch from "@/features/events/EventSearch";
import EventDetail from "@/features/events/EventDetail";

// Auth Feature
import Login from "@/features/auth/Login";
import Register from "@/features/auth/Register";
import GoogleAuthPopupCallback from "@/features/auth/components/GoogleAuthPopupCallback";
import ForgotPassword from "@/features/auth/ForgotPassword";
import ResetPassword from "@/features/auth/ResetPassword";
import { authApi, createIdempotencyKey } from "@/services/authApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { getCachedUserProfile, parseJwt, userApi } from "@/services/userApi";
import type { LoginCredentials } from "@/features/auth/Login";
import type { RegistrationData, RegistrationOtpData } from "@/features/auth/Register";
import type { PasswordRecoveryRequest } from "@/features/auth/ForgotPassword";
import type { PasswordResetData } from "@/features/auth/ResetPassword";

// Tickets Feature
import SelectTicket from "@/features/tickets/SelectTicket";
import Checkout from "@/features/tickets/Checkout";
import BookingSuccess from "@/features/tickets/BookingSuccess";
import PaymentCallback from "@/features/tickets/PaymentCallback";
import TicketDetail from "@/features/tickets/TicketDetail";
import OrderDetail from "@/features/tickets/OrderDetail";
import GiftInvitation from "@/features/tickets/GiftInvitation";

// User Feature
import Profile from "@/features/user/Profile";
import EkycVerification from "@/features/ekyc/EkycVerification";

// Organizer Feature
import CreateEvent from "@/features/organizer/CreateEvent";
import MyEvents from "@/features/organizer/MyEvents";
import OrganizerFinance from "@/features/organizer/OrganizerFinance";
import OrganizerTerms from "@/features/organizer/OrganizerTerms";

// Event Management Portal Feature
import EventManageLayout from "@/layouts/EventManageLayout";
import { EventOverview } from "@/features/organizer/event-manage/EventOverview";
import { EventOrderList } from "@/features/organizer/event-manage/EventOrderList";
import { EventCheckin } from "@/features/organizer/event-manage/EventCheckin";
import { EventMembers } from "@/features/organizer/event-manage/EventMembers";
import { EventVouchers } from "@/features/organizer/event-manage/EventVouchers";
import { EventSeatingMap } from "@/features/organizer/event-manage/EventSeatingMap";
import { EventSeatingAssigner } from "@/features/organizer/event-manage/EventSeatingAssigner";
import { EventEditInfo } from "@/features/organizer/event-manage/EventEditInfo";
import EventTransfers from "@/features/organizer/event-manage/EventTransfers";
import { EventShowtimes } from "@/features/organizer/event-manage/EventShowtimes";

// Resale Feature
import ResaleList from "@/features/resale/ResaleList";
import ResaleEventDetail from "@/features/resale/ResaleEventDetail";
import ResaleTicketCheckout from "@/features/resale/ResaleTicketCheckout";
import ResaleTransactionResult from "@/features/resale/ResaleTransactionResult";

// Admin Feature
import AdminDashboard from "@/features/admin/AdminDashboard";
import AdminNotifications from "@/features/admin/AdminNotifications";
import AdminSettings from "@/features/admin/settings/AdminSettings";
import EventApproval from "@/features/admin/EventApproval";
import EventApprovalDetail from "@/features/admin/events/EventApprovalDetail";
import AdminAiAnalytics from "@/features/admin/AdminAiAnalytics";
import SystemHealth from "@/features/admin/SystemHealth";
import AdminVenuesManagement from "@/features/admin/AdminVenuesManagement";
import AdminSectionHub from "@/features/admin/AdminSectionHub";
import AdminUserManagement from "@/features/admin/UserManagement";
import AdminUserDetail from "@/features/admin/UserDetail";
import AdminEventReports from "@/features/admin/reports/AdminEventReports";
import AdminEventReportDetail from "@/features/admin/reports/AdminEventReportDetail";
import AdminPaymentMonitoring from "@/features/admin/PaymentMonitoring";
import AdminHomepageConfig from "@/features/admin/HomepageConfig";
import AdminCategoryConfig from "@/features/admin/CategoryConfig";

// Common / Error
import NotFound from "@/features/common/NotFound";

function checkIsAdmin(): boolean {
  const authed = getKeycloakSession().isAuthenticated();
  if (!authed) return false;
  const profile = getCachedUserProfile();
  if (
    profile?.roles?.some(
      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ROLE_ADMIN"
    )
  ) {
    return true;
  }
  const token = getKeycloakSession().getCurrentToken();
  if (token) {
    const payload = parseJwt(token);
    const roles = payload?.realm_access?.roles || [];
    return roles.some(
      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ROLE_ADMIN"
    );
  }
  return false;
}

function CustomerRouteGuard({ children }: { children: React.ReactNode }) {
  if (checkIsAdmin()) {
    return <Navigate to={PATHS.ADMIN_DASHBOARD} replace />;
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authed = getKeycloakSession().isAuthenticated();
  if (!authed) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }
  if (checkIsAdmin()) {
    return <Navigate to={PATHS.ADMIN_DASHBOARD} replace />;
  }
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const authed = getKeycloakSession().isAuthenticated();
  if (!authed) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }
  if (!checkIsAdmin()) {
    return <Navigate to={PATHS.HOME} replace />;
  }
  return <>{children}</>;
}

function AuthHandlers() {
  const navigate = useNavigate();

  const redirectAfterLogin = async (token?: string) => {
    let isAdmin = false;
    try {
      const profile = await userApi.syncCurrentUser();
      isAdmin =
        profile?.roles?.some(
          (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ROLE_ADMIN"
        ) ?? false;
    } catch {
      const rawToken = token || getKeycloakSession().getCurrentToken();
      if (rawToken) {
        const payload = parseJwt(rawToken);
        const roles = payload?.realm_access?.roles || [];
        isAdmin = roles.some(
          (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ROLE_ADMIN"
        );
      }
    }

    if (isAdmin) {
      navigate(PATHS.ADMIN_DASHBOARD, { replace: true });
    } else {
      const giftReturn = sessionStorage.getItem("haloticket_gift_return");
      sessionStorage.removeItem("haloticket_gift_return");
      const authRedirect = sessionStorage.getItem("haloticket_auth_redirect");
      sessionStorage.removeItem("haloticket_auth_redirect");
      const targetPath = giftReturn?.startsWith(PATHS.GIFT_ACCEPT + "?")
        ? giftReturn
        : authRedirect || PATHS.HOME;
      navigate(targetPath, { replace: true });
    }
  };

  const login = async ({ email, password }: LoginCredentials) => {
    const result = await authApi.login(email, password);
    localStorage.setItem("access_token", result.accessToken);
    if (result.refreshToken) localStorage.setItem("refresh_token", result.refreshToken);
    if (result.idToken) localStorage.setItem("id_token", result.idToken);
    await redirectAfterLogin(result.accessToken);
  };

  const registerStart = (data: RegistrationData) => authApi.registerStart(data.email, data.password, createIdempotencyKey("register"));
  const registerVerify = ({ challengeId, email, password, otp }: RegistrationOtpData) => authApi.registerVerify(challengeId, email, password, otp);
  const registerResend = (challengeId: string) => authApi.registerResend(challengeId);
  const forgotStart = (data: PasswordRecoveryRequest) => authApi.forgotStart(data.identifier, createIdempotencyKey("password-reset"));
  const forgotVerify = (challengeId: string, otp: string) => authApi.forgotVerify(challengeId, otp);
  const forgotResend = (challengeId: string) => authApi.forgotResend(challengeId);
  const resetPassword = (data: PasswordResetData) => authApi.resetPassword(data.resetToken, data.password);

  const googleLogin = async () => {
    await getKeycloakSession().loginWithGoogle();
    await redirectAfterLogin();
  };

  return { login, googleLogin, registerStart, registerVerify, registerResend, forgotStart, forgotVerify, forgotResend, resetPassword };
}
function AuthLoginRoute() { const handlers = AuthHandlers(); return <Login onSubmit={handlers.login} onGoogleLogin={handlers.googleLogin} />; }
function AuthRegisterRoute() { const handlers = AuthHandlers(); return <Register onSubmit={handlers.registerStart} onVerifyOtp={handlers.registerVerify} onResendOtp={handlers.registerResend} onGoogleLogin={handlers.googleLogin} />; }
function AuthForgotRoute() { const handlers = AuthHandlers(); return <ForgotPassword onSubmit={handlers.forgotStart} onVerifyOtp={handlers.forgotVerify} onResendOtp={handlers.forgotResend} />; }
function AuthResetRoute() { return <ResetPassword onSubmit={AuthHandlers().resetPassword} />; }

export const router = createBrowserRouter([
  {
    path: "/auth/popup-callback",
    element: <GoogleAuthPopupCallback />,
  },

  // Ticket Booking Flow Routes (Header + Outlet, NO Footer)
  {
    element: <BookingLayout />,
    children: [
      {
        path: "/events/:id/select-ticket",
        element: <SelectTicket />,
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
        path: PATHS.PAYMENT_CALLBACK,
        element: <PaymentCallback />,
      },
    ],
  },

  // Main App Routes (with Main Header & Footer)
  {
    path: PATHS.HOME,
    element: (
      <CustomerRouteGuard>
        <MainLayout />
      </CustomerRouteGuard>
    ),
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
        path: "/resale-ticket/result/:sagaId",
        element: <ResaleTransactionResult />,
      },
      {
        path: "/my-tickets",
        element: <Navigate to="/profile?tab=tickets" replace />,
      },
      {
        path: "/my-tickets/orders/:orderCode",
        element: (
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.GIFT_ACCEPT,
        element: <GiftInvitation />,
      },
      {
        path: "/my-tickets/:id",
        element: (
          <ProtectedRoute>
            <TicketDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.PROFILE,
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.EKYC,
        element: (
          <ProtectedRoute>
            <EkycVerification />
          </ProtectedRoute>
        ),
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
        element: <AuthLoginRoute />,
      },
      {
        path: PATHS.REGISTER,
        element: <AuthRegisterRoute />,
      },
      {
        path: PATHS.FORGOT_PASSWORD,
        element: <AuthForgotRoute />,
      },
      {
        path: PATHS.RESET_PASSWORD,
        element: <AuthResetRoute />,
      },
    ],
  },

  // Organizer Center Routes (Separate Layout WITHOUT Main Header & Footer)
  {
    element: (
      <ProtectedRoute>
        <OrganizerLayout />
      </ProtectedRoute>
    ),
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
        path: PATHS.FINANCE,
        element: <OrganizerFinance />,
      },
      {
        path: "/organizer/reports",
        element: <Navigate to={PATHS.FINANCE} replace />,
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

  // Standalone Event Management Portal Routes
  {
    path: "/organizer/events/:eventId/manage",
    element: (
      <ProtectedRoute>
        <EventManageLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="overview" replace />,
      },
      {
        path: "overview",
        element: <EventOverview />,
      },
      {
        path: "orders",
        element: <EventOrderList />,
      },
      {
        path: "checkin",
        element: <EventCheckin />,
      },
      {
        path: "members",
        element: <EventMembers />,
      },
      {
        path: "vouchers",
        element: <EventVouchers />,
      },
      {
        path: "seating",
        element: <EventSeatingMap />,
      },
      {
        path: "ticket-assign",
        element: <EventSeatingAssigner />,
      },
      {
        path: "edit",
        element: <EventEditInfo />,
      },
      {
        path: "showtimes",
        element: <EventShowtimes />,
      },
      {
        path: "transfers",
        element: <EventTransfers />,
      },
    ],
  },

  // Admin Portal Routes (Separate Admin Layout)
  {
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      {
        path: PATHS.ADMIN,
        element: <Navigate to={PATHS.ADMIN_DASHBOARD} replace />,
      },
      {
        path: PATHS.ADMIN_DASHBOARD,
        element: <AdminDashboard />,
      },
      ...[PATHS.ADMIN_EVENT_MANAGEMENT, PATHS.ADMIN_CONTENT, PATHS.ADMIN_AI].map((path) => ({ path, element: <AdminSectionHub /> })),
      { path: PATHS.ADMIN_EVENT_REPORTS, element: <AdminEventReports /> },
      { path: `${PATHS.ADMIN_EVENT_REPORTS}/:eventId`, element: <AdminEventReportDetail /> },
      { path: PATHS.ADMIN_NOTIFICATIONS, element: <AdminNotifications /> },
      { path: PATHS.ADMIN_USER_MANAGEMENT, element: <AdminUserManagement /> },
      { path: `${PATHS.ADMIN_USER_MANAGEMENT}/:userId`, element: <AdminUserDetail /> },
      { path: PATHS.ADMIN_FINANCE, element: <AdminPaymentMonitoring /> },
      { path: `${PATHS.ADMIN_TICKET_MARKET}/*`, element: <Navigate to={PATHS.ADMIN_EVENT_MANAGEMENT} replace /> },
      { path: PATHS.ADMIN_HOMEPAGE_CONTENT, element: <AdminHomepageConfig /> },
      { path: PATHS.ADMIN_EVENT_CATEGORIES, element: <AdminCategoryConfig /> },
      { path: PATHS.ADMIN_AI_ANALYTICS, element: <AdminAiAnalytics /> },
      { path: PATHS.ADMIN_SYSTEM_MONITORING, element: <SystemHealth /> },
      { path: PATHS.ADMIN_SYSTEM_SETTINGS, element: <AdminSettings /> },
      {
        path: PATHS.ADMIN_SETTINGS,
        element: <Navigate to={PATHS.ADMIN_SETTINGS_SECTION("profile")} replace />,
      },
      {
        path: "/admin/settings/:section",
        element: <AdminSettings />,
      },
      {
        path: PATHS.ADMIN_IDENTITY_VERIFICATION,
        element: <EkycVerification />,
      },
      {
        path: PATHS.ADMIN_EVENTS_APPROVAL,
        element: <EventApproval />,
      },
      {
        path: "/admin/events-approval/:eventId",
        element: <EventApprovalDetail />,
      },
      {
        path: PATHS.ADMIN_RESALE_PRICE_CAP,
        element: <Navigate to={PATHS.ADMIN_EVENT_MANAGEMENT} replace />,
      },
      {
        path: PATHS.ADMIN_AI_ANALYTICS,
        element: <AdminAiAnalytics />,
      },
      {
        path: PATHS.ADMIN_USERS_PERMISSIONS,
        element: <Navigate to={PATHS.ADMIN_CUSTOMERS} replace />,
      },
      {
        path: PATHS.ADMIN_CATEGORIES_CONFIG,
        element: <Navigate to={PATHS.ADMIN_EVENT_CATEGORIES} replace />,
      },
      {
        path: PATHS.ADMIN_PAYMENTS_MONITORING,
        element: <Navigate to={PATHS.ADMIN_PAYMENT_TRANSACTIONS} replace />,
      },
      {
        path: PATHS.ADMIN_SYSTEM_HEALTH,
        element: <Navigate to={PATHS.ADMIN_SYSTEM_MONITORING} replace />,
      },
      {
        path: "/admin/monitoring/services",
        element: <Navigate to={PATHS.ADMIN_SYSTEM_HEALTH} replace />,
      },
      {
        path: PATHS.ADMIN_AUDIT_LOGS,
        element: <Navigate to={PATHS.ADMIN_SYSTEM_MONITORING} replace />,
      },
      {
        path: "/admin/monitoring/audit-logs",
        element: <Navigate to={PATHS.ADMIN_AUDIT_LOGS} replace />,
      },
      {
        path: "/admin/ai-analytics",
        element: <Navigate to={PATHS.ADMIN_AI_ANALYTICS} replace />,
      },
      {
        path: PATHS.ADMIN_HOMEPAGE_CONFIG,
        element: <Navigate to={PATHS.ADMIN_HOMEPAGE_CONTENT} replace />,
      },
      {
        path: PATHS.ADMIN_VENUES_MANAGEMENT,
        element: <AdminVenuesManagement />,
      },
    ],
  },
]);
