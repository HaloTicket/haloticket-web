/* This module intentionally co-locates route definitions and their small auth adapters. */
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, useNavigate } from "react-router-dom";
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
import MyTickets from "@/features/tickets/MyTickets";
import TicketDetail from "@/features/tickets/TicketDetail";

// User Feature
import Profile from "@/features/user/Profile";

// Organizer Feature
import CreateEvent from "@/features/organizer/CreateEvent";
import MyEvents from "@/features/organizer/MyEvents";
import OrganizerReports from "@/features/organizer/OrganizerReports";
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
import AdminVenuesManagement from "@/features/admin/AdminVenuesManagement";

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
      navigate(PATHS.HOME, { replace: true });
    }
  };

  const login = async ({ email, password }: LoginCredentials) => {
    const result = await authApi.login(email, password);
    localStorage.setItem("access_token", result.accessToken);
    if (result.refreshToken) localStorage.setItem("refresh_token", result.refreshToken);
    if (result.idToken) localStorage.setItem("id_token", result.idToken);
    try {
      const cleanName = email.split("@")[0];
      const accountToSave = {
        name: cleanName,
        email,
      };
      localStorage.setItem("haloticket_last_google_account", JSON.stringify(accountToSave));
      window.dispatchEvent(new CustomEvent("google-account-updated", { detail: accountToSave }));
    } catch {
      // ignore
    }
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
        element: (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.BOOKING_SUCCESS,
        element: (
          <ProtectedRoute>
            <BookingSuccess />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.MY_TICKETS,
        element: (
          <ProtectedRoute>
            <MyTickets />
          </ProtectedRoute>
        ),
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
      {
        path: PATHS.ADMIN_VENUES_MANAGEMENT,
        element: <AdminVenuesManagement />,
      },
    ],
  },
]);
