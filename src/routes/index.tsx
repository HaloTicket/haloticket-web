/* This module intentionally co-locates route definitions and their small auth adapters. */
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, useNavigate } from "react-router-dom";
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
import GoogleAuthPopupCallback from "@/features/auth/components/GoogleAuthPopupCallback";
import ForgotPassword from "@/features/auth/ForgotPassword";
import ResetPassword from "@/features/auth/ResetPassword";
import { authApi, createIdempotencyKey } from "@/services/authApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import type { LoginCredentials } from "@/features/auth/Login";
import type { RegistrationData, RegistrationOtpData } from "@/features/auth/Register";
import type { PasswordRecoveryRequest } from "@/features/auth/ForgotPassword";
import type { PasswordResetData } from "@/features/auth/ResetPassword";

function AuthHandlers() {
  const navigate = useNavigate();
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
    navigate(PATHS.HOME, { replace: true });
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
    navigate(PATHS.HOME, { replace: true });
  };
  return { login, googleLogin, registerStart, registerVerify, registerResend, forgotStart, forgotVerify, forgotResend, resetPassword };
}
function AuthLoginRoute() { const handlers = AuthHandlers(); return <Login onSubmit={handlers.login} onGoogleLogin={handlers.googleLogin} />; }
function AuthRegisterRoute() { const handlers = AuthHandlers(); return <Register onSubmit={handlers.registerStart} onVerifyOtp={handlers.registerVerify} onResendOtp={handlers.registerResend} onGoogleLogin={handlers.googleLogin} />; }
function AuthForgotRoute() { const handlers = AuthHandlers(); return <ForgotPassword onSubmit={handlers.forgotStart} onVerifyOtp={handlers.forgotVerify} onResendOtp={handlers.forgotResend} />; }
function AuthResetRoute() { return <ResetPassword onSubmit={AuthHandlers().resetPassword} />; }

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
  {
    path: "/auth/popup-callback",
    element: <GoogleAuthPopupCallback />,
  },

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
