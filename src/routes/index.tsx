/* Mô-đun này cố ý đặt chung phần khai báo route và các bộ chuyển đổi xác thực nhỏ. */
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, useNavigate, useLocation } from "react-router-dom";
import { PATHS } from "./paths";

// Layouts
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import OrganizerLayout from "@/layouts/OrganizerLayout";
import AdminLayout from "@/layouts/AdminLayout";
import BookingLayout from "@/layouts/BookingLayout";

// Tính năng sự kiện
import Home from "@/features/events/Home";
import EventSearch from "@/features/events/EventSearch";
import EventDetail from "@/features/events/EventDetail";

// Tính năng Blog công khai
import BlogListPage from "@/features/blog/BlogListPage";
import BlogDetailPage from "@/features/blog/BlogDetailPage";

// Tính năng xác thực
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

// Tính năng vé
import SelectTicket from "@/features/tickets/SelectTicket";
import Checkout from "@/features/tickets/Checkout";
import BookingSuccess from "@/features/tickets/BookingSuccess";
import PaymentCallback from "@/features/tickets/PaymentCallback";
import TicketDetail from "@/features/tickets/TicketDetail";
import OrderDetail from "@/features/tickets/OrderDetail";
import GiftInvitation from "@/features/tickets/GiftInvitation";
import MemberInvitation from "@/features/organizer/event-manage/MemberInvitation";

// Tính năng người dùng
import Profile from "@/features/user/Profile";
import EkycVerification from "@/features/ekyc/EkycVerification";

// Tính năng nhà tổ chức
import CreateEvent from "@/features/organizer/CreateEvent";
import MyEvents from "@/features/organizer/MyEvents";
import OrganizerFinance from "@/features/organizer/OrganizerFinance";
import WithdrawalDetail from "@/features/organizer/finance/WithdrawalDetail";
import OrganizerTerms from "@/features/organizer/OrganizerTerms";

// Tính năng cổng quản lý sự kiện
import EventManageLayout from "@/layouts/EventManageLayout";
import { EventOverview } from "@/features/organizer/event-manage/EventOverview";
import { EventManageIndexRedirect, EventManageRoleGate } from "@/features/organizer/event-manage/components/EventManageRoleGate";
import { ANNOUNCEMENT_ROLES, FULL_ACCESS_ROLES, VIEW_ACCESS_ROLES } from "@/features/organizer/event-manage/eventManageRoles";
import { EventOrderList } from "@/features/organizer/event-manage/EventOrderList";
import { EventCheckin } from "@/features/organizer/event-manage/EventCheckin";
import { EventMembers } from "@/features/organizer/event-manage/EventMembers";
import { EventVouchers } from "@/features/organizer/event-manage/EventVouchers";
import { EventAnnouncements } from "@/features/organizer/event-manage/EventAnnouncements";
import { EventSeatingMap } from "@/features/organizer/event-manage/EventSeatingMap";
import { EventSeatingAssigner } from "@/features/organizer/event-manage/EventSeatingAssigner";
import { EventEditInfo } from "@/features/organizer/event-manage/EventEditInfo";
import EventTransfers from "@/features/organizer/event-manage/EventTransfers";
import { EventShowtimes } from "@/features/organizer/event-manage/EventShowtimes";

// Tính năng bán lại vé
import ResaleList from "@/features/resale/ResaleList";
import ResaleEventDetail from "@/features/resale/ResaleEventDetail";
import ResaleTicketCheckout from "@/features/resale/ResaleTicketCheckout";
import ResaleTransactionResult from "@/features/resale/ResaleTransactionResult";

// Tính năng quản trị
import AdminDashboard from "@/features/admin/AdminDashboard";
import AdminNotifications from "@/features/admin/AdminNotifications";
import AdminSettings from "@/features/admin/settings/AdminSettings";
import EventApproval from "@/features/admin/EventApproval";
import EventApprovalDetail from "@/features/admin/events/EventApprovalDetail";
import AdminAiAnalytics from "@/features/admin/AdminAiAnalytics";
import SystemHealth from "@/features/admin/SystemHealth";
import AdminVenuesManagement from "@/features/admin/AdminVenuesManagement";
import AdminVenueSeatmapDesigner from "@/features/admin/venues/AdminVenueSeatmapDesigner";
import AdminSectionHub from "@/features/admin/AdminSectionHub";
import AdminUserManagement from "@/features/admin/UserManagement";
import AdminUserDetail from "@/features/admin/UserDetail";
import AdminEventReports from "@/features/admin/reports/AdminEventReports";
import AdminEventReportDetail from "@/features/admin/reports/AdminEventReportDetail";
import AdminPaymentMonitoring from "@/features/admin/PaymentMonitoring";
import AdminOrderReconciliation from "@/features/admin/OrderReconciliation";
import AdminHomepageConfig from "@/features/admin/HomepageConfig";
import AdminCategoryConfig from "@/features/admin/CategoryConfig";

// Dùng chung / trang lỗi
import NotFound from "@/features/common/NotFound";

/** Kiểm tra người dùng hiện tại có vai trò quản trị hay không, ưu tiên hồ sơ đã lưu đệm, nếu không có thì đọc vai trò từ JWT. Trả về `false` khi chưa đăng nhập. */
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

/** Chặn quản trị viên khỏi các trang dành cho khách hàng và chuyển họ về trang tổng quan quản trị. */
function CustomerRouteGuard({ children }: { children: React.ReactNode }) {
  if (checkIsAdmin()) {
    return <Navigate to={PATHS.ADMIN_DASHBOARD} replace />;
  }
  return <>{children}</>;
}

/** Chỉ cho phép người dùng đã đăng nhập và không phải quản trị viên. Chưa đăng nhập thì lưu đường dẫn hiện tại để quay lại sau khi đăng nhập. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const authed = getKeycloakSession().isAuthenticated();
  if (!authed) {
    sessionStorage.setItem("haloticket_auth_redirect", location.pathname + location.search);
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />;
  }
  if (checkIsAdmin()) {
    return <Navigate to={PATHS.ADMIN_DASHBOARD} replace />;
  }
  return <>{children}</>;
}

/** Chỉ cho phép quản trị viên đã đăng nhập; chưa đăng nhập thì về trang đăng nhập, không đủ quyền thì về trang chủ. */
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

/** Gom các hàm xử lý đăng nhập, đăng ký, quên mật khẩu và đăng nhập Google, kèm bước điều hướng sau khi đăng nhập. */
function AuthHandlers() {
  const navigate = useNavigate();

    /** Điều hướng sau đăng nhập: quản trị viên về trang tổng quan quản trị, người dùng thường về đường dẫn đã lưu (lời mời nhận quà hoặc trang trước đó) hoặc trang chủ. */
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

    /** Đăng nhập bằng email và mật khẩu, lưu token vào `localStorage`, gọi `onSuccess` rồi chờ một lúc trước khi điều hướng. */
  const login = async ({ email, password }: LoginCredentials, onSuccess?: () => void) => {
    const result = await authApi.login(email, password);
    localStorage.setItem("access_token", result.accessToken);
    if (result.refreshToken) localStorage.setItem("refresh_token", result.refreshToken);
    if (result.idToken) localStorage.setItem("id_token", result.idToken);
    onSuccess?.();
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    await redirectAfterLogin(result.accessToken);
  };

    /** Bắt đầu đăng ký tài khoản, gửi email và mật khẩu kèm khóa idempotency. */
  const registerStart = (data: RegistrationData) => authApi.registerStart(data.email, data.password, createIdempotencyKey("register"));
    /** Xác thực mã OTP của bước đăng ký. */
  const registerVerify = ({ challengeId, email, password, otp }: RegistrationOtpData) => authApi.registerVerify(challengeId, email, password, otp);
    /** Gửi lại mã OTP đăng ký. */
  const registerResend = (challengeId: string) => authApi.registerResend(challengeId);
    /** Bắt đầu quy trình quên mật khẩu theo định danh người dùng nhập. */
  const forgotStart = (data: PasswordRecoveryRequest) => authApi.forgotStart(data.identifier, createIdempotencyKey("password-reset"));
    /** Xác thực mã OTP của quy trình quên mật khẩu. */
  const forgotVerify = (challengeId: string, otp: string) => authApi.forgotVerify(challengeId, otp);
    /** Gửi lại mã OTP của quy trình quên mật khẩu. */
  const forgotResend = (challengeId: string) => authApi.forgotResend(challengeId);
    /** Đặt lại mật khẩu bằng token đặt lại nhận được sau khi xác thực OTP. */
  const resetPassword = (data: PasswordResetData) => authApi.resetPassword(data.resetToken, data.password);

    /** Đăng nhập bằng Google qua cửa sổ popup Keycloak rồi điều hướng như đăng nhập thường. */
  const googleLogin = async () => {
    await getKeycloakSession().loginWithGoogle();
    await redirectAfterLogin();
  };

  return { login, googleLogin, registerStart, registerVerify, registerResend, forgotStart, forgotVerify, forgotResend, resetPassword };
}
/** Trang đăng nhập, nối form với các hàm xử lý đăng nhập. */
function AuthLoginRoute() { const handlers = AuthHandlers(); return <Login onSubmit={handlers.login} onGoogleLogin={handlers.googleLogin} />; }
/** Trang đăng ký, nối form với bước gửi, xác thực và gửi lại OTP. */
function AuthRegisterRoute() { const handlers = AuthHandlers(); return <Register onSubmit={handlers.registerStart} onVerifyOtp={handlers.registerVerify} onResendOtp={handlers.registerResend} onGoogleLogin={handlers.googleLogin} />; }
/** Trang quên mật khẩu, nối form với bước gửi, xác thực và gửi lại OTP. */
function AuthForgotRoute() { const handlers = AuthHandlers(); return <ForgotPassword onSubmit={handlers.forgotStart} onVerifyOtp={handlers.forgotVerify} onResendOtp={handlers.forgotResend} />; }
/** Trang đặt lại mật khẩu, nối form với hàm đặt lại mật khẩu. */
function AuthResetRoute() { return <ResetPassword onSubmit={AuthHandlers().resetPassword} />; }

export const router = createBrowserRouter([
  {
    path: "/auth/popup-callback",
    element: <GoogleAuthPopupCallback />,
  },

  // Các route luồng đặt vé (Header + Outlet, KHÔNG có Footer)
  {
    element: <BookingLayout />,
    children: [
      {
        path: "/events/:id/select-ticket",
        element: (
          <ProtectedRoute>
            <SelectTicket />
          </ProtectedRoute>
        ),
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
        path: PATHS.PAYMENT_CALLBACK,
        element: <PaymentCallback />,
      },
    ],
  },

  // Các route chính của ứng dụng (có Header và Footer chính)
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
        path: PATHS.BLOG,
        element: <BlogListPage />,
      },
      {
        path: "/blog/:slug",
        element: <BlogDetailPage />,
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
        path: PATHS.EVENT_INVITATION_ACCEPT,
        element: <MemberInvitation />,
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

  // Các route xác thực (dùng layout xác thực)
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

  // Các route Trung tâm nhà tổ chức (layout riêng, KHÔNG có Header và Footer chính)
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
        path: "/organizer/finance/withdrawals/:id",
        element: <WithdrawalDetail />,
      },
      {
        path: "/organizer/reports",
        element: <Navigate to={PATHS.REPORTS} replace />,
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

  // Các route cổng quản lý sự kiện độc lập
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
        element: <EventManageIndexRedirect />,
      },
      {
        path: "overview",
        element: (
          <EventManageRoleGate allow={VIEW_ACCESS_ROLES}>
            <EventOverview />
          </EventManageRoleGate>
        ),
      },
      {
        path: "orders",
        element: (
          <EventManageRoleGate allow={VIEW_ACCESS_ROLES}>
            <EventOrderList />
          </EventManageRoleGate>
        ),
      },
      {
        path: "checkin",
        element: <EventCheckin />,
      },
      {
        path: "members",
        element: (
          <EventManageRoleGate allow={VIEW_ACCESS_ROLES}>
            <EventMembers />
          </EventManageRoleGate>
        ),
      },
      {
        path: "announcements",
        element: (
          <EventManageRoleGate allow={ANNOUNCEMENT_ROLES}>
            <EventAnnouncements />
          </EventManageRoleGate>
        ),
      },
      {
        path: "vouchers",
        element: (
          <EventManageRoleGate allow={FULL_ACCESS_ROLES}>
            <EventVouchers />
          </EventManageRoleGate>
        ),
      },
      {
        path: "seating",
        element: (
          <EventManageRoleGate allow={FULL_ACCESS_ROLES}>
            <EventSeatingMap />
          </EventManageRoleGate>
        ),
      },
      {
        path: "ticket-assign",
        element: (
          <EventManageRoleGate allow={FULL_ACCESS_ROLES}>
            <EventSeatingAssigner />
          </EventManageRoleGate>
        ),
      },
      {
        path: "edit",
        element: (
          <EventManageRoleGate allow={FULL_ACCESS_ROLES}>
            <EventEditInfo />
          </EventManageRoleGate>
        ),
      },
      {
        path: "showtimes",
        element: (
          <EventManageRoleGate allow={FULL_ACCESS_ROLES}>
            <EventShowtimes />
          </EventManageRoleGate>
        ),
      },
      {
        path: "transfers",
        element: (
          <EventManageRoleGate allow={VIEW_ACCESS_ROLES}>
            <EventTransfers />
          </EventManageRoleGate>
        ),
      },
    ],
  },

  // Các route cổng quản trị (layout quản trị riêng)
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
      { path: PATHS.ADMIN_RECONCILIATION, element: <AdminOrderReconciliation /> },
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
  {
    path: "/admin/venues/:venueId/seatmap",
    element: (
      <AdminProtectedRoute>
        <AdminVenueSeatmapDesigner />
      </AdminProtectedRoute>
    ),
  },
  {
    path: "/admin/*",
    element: (
      <AdminProtectedRoute>
        <NotFound variant="admin" />
      </AdminProtectedRoute>
    ),
  },
]);
