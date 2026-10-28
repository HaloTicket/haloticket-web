import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiCheckCircle, FiLoader, FiMail, FiXCircle } from "react-icons/fi";

import { eventApi } from "@/services/eventApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { PATHS } from "@/routes/paths";
import {
  clearMemberInvitationToken,
  loadMemberInvitationToken,
  readTokenFromHash,
  saveMemberInvitationToken,
} from "@/services/memberInvitationToken";
import type { MemberInvitationPreview } from "@/types";
import { matchInvitationCode, readApiFailure } from "./memberInvitationErrors";

type Phase =
  | { name: "loading" }
  | { name: "ready"; invitation: MemberInvitationPreview }
  | { name: "notFound" }
  | { name: "error" }
  | { name: "accepted"; eventId: string; role: string }
  | { name: "declined" };

const ROLE_KEYS = ["OWNER", "ADMIN", "MANAGER", "CHECKIN_STAFF"];

function isNotFound(error: unknown) {
  const failure = readApiFailure(error);
  return failure.status === 404 || matchInvitationCode(failure) === "INVITATION_NOT_FOUND";
}

// the token is retrieved solely from the fragment (#token=...). If it is not present, the version saved during the login process is used instead.
function readTokenOnce(): string {
  try {
    const fromHash = readTokenFromHash(window.location.hash);
    if (fromHash) {
      saveMemberInvitationToken(fromHash);
      return fromHash;
    }
  } catch {
    // fall through to the stored copy
  }
  return loadMemberInvitationToken();
}

const card = "w-full max-w-md rounded-2xl border app-border app-bg-card p-8 text-center shadow-lg";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border app-border app-bg-main px-6 text-sm font-semibold app-text-main transition hover:bg-slate-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

export default function MemberInvitation() {
  const { t } = useTranslation();
  const [token] = useState(readTokenOnce);
  const authenticated = getKeycloakSession().isAuthenticated();
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, []);

  const failWith = useCallback((error: unknown) => {
    if (isNotFound(error)) {
      clearMemberInvitationToken();
      setPhase({ name: "notFound" });
    } else {
      setPhase({ name: "error" });
    }
  }, []);

  useEffect(() => {
    if (!authenticated || !token) return;
    let cancelled = false;
    eventApi.previewMemberInvitation(token).then(
      (invitation) => { if (!cancelled) setPhase({ name: "ready", invitation }); },
      (error) => { if (!cancelled) failWith(error); },
    );
    return () => { cancelled = true; };
  }, [authenticated, token, attempt, failWith]);

  const roleLabel = useCallback(
    (role: string) => (ROLE_KEYS.includes(role) ? t(`members.invitation.role.${role}`) : role),
    [t],
  );

  // returnTo login: save the token and set a redirect to this page after login
  const rememberReturn = () => {
    saveMemberInvitationToken(token);
    try {
      sessionStorage.setItem("haloticket_auth_redirect", PATHS.EVENT_INVITATION_ACCEPT);
    } catch { /* storage may be disabled. */ }
  };

  const switchAccount = () => {
    void getKeycloakSession()
      .logout(`${window.location.origin}${PATHS.LOGIN}`)
      .catch(() => { window.location.assign(PATHS.LOGIN); });
  };

  const respond = async (action: "accept" | "decline") => {
    if (busy) return;
    setBusy(action);
    try {
      if (action === "accept") {
        const result = await eventApi.acceptMemberInvitation(token);
        clearMemberInvitationToken();
        setPhase({ name: "accepted", eventId: result.eventId, role: result.role });
      } else {
        await eventApi.declineMemberInvitation(token);
        clearMemberInvitationToken();
        setPhase({ name: "declined" });
      }
    } catch (error) {
      failWith(error);
    } finally {
      setBusy(null);
    }
  };

  const shell = (children: React.ReactNode) => (
    <main className="flex min-h-[60vh] items-center justify-center app-bg-page app-text-main px-4 py-12">
      <div className={card}>{children}</div>
    </main>
  );
  const icon = (node: React.ReactNode, tone: string) => (
    <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${tone}`}>{node}</div>
  );

  if (!token) {
    return shell(
      <div role="alert">
        {icon(<FiAlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" aria-hidden="true" />, "bg-rose-100 dark:bg-rose-900/30")}
        <h1 className="text-xl font-bold">{t("members.invitation.accept.title")}</h1>
        <p className="mt-2 text-sm app-text-muted">{t("members.invitation.accept.noToken")}</p>
        <Link to={PATHS.HOME} className={`${secondaryButton} mt-6`}>{t("members.invitation.accept.home")}</Link>
      </div>,
    );
  }

  if (!authenticated) {
    return shell(
      <>
        {icon(<FiMail className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />, "bg-blue-100 dark:bg-blue-900/30")}
        <h1 className="text-xl font-bold">{t("members.invitation.accept.title")}</h1>
        <p className="mt-2 text-sm app-text-muted">{t("members.invitation.accept.loginIntro")}</p>
        <Link to={PATHS.LOGIN} onClick={rememberReturn} className={`${primaryButton} mt-6`}>
          {t("members.invitation.accept.login")}
        </Link>
        <p className="mt-6 text-xs app-text-muted">{t("members.invitation.accept.newUserHint")}</p>
        <Link to={PATHS.FORGOT_PASSWORD} className="mt-2 inline-block text-sm font-semibold text-blue-600 underline dark:text-blue-400">
          {t("members.invitation.accept.forgot")}
        </Link>
      </>,
    );
  }

  switch (phase.name) {
    case "loading":
      return shell(
        <div role="status">
          <FiLoader className="mx-auto h-8 w-8 app-text-muted motion-safe:animate-spin" aria-hidden="true" />
          <p className="mt-3 text-sm app-text-muted">{t("members.invitation.accept.loading")}</p>
        </div>,
      );
    case "notFound":
    case "error":
      return shell(
        <div role="alert">
          {icon(<FiAlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" aria-hidden="true" />, "bg-rose-100 dark:bg-rose-900/30")}
          <h1 className="text-xl font-bold">{t("members.invitation.accept.title")}</h1>
          <p className="mt-2 text-sm app-text-muted">
            {phase.name === "notFound" ? t("members.invitation.accept.notFound") : t("members.invitation.accept.genericError")}
          </p>
          {phase.name === "notFound" && (
            <p className="mt-3 text-sm app-text-muted">{t("members.invitation.accept.notFoundHint")}</p>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {phase.name === "notFound" && (
              <button type="button" onClick={switchAccount} className={primaryButton}>
                {t("members.invitation.accept.switchAccount")}
              </button>
            )}
            {phase.name === "error" && (
              <button type="button" onClick={() => { setPhase({ name: "loading" }); setAttempt((n) => n + 1); }} className={primaryButton}>
                {t("members.invitation.accept.retry")}
              </button>
            )}
            <Link to={PATHS.HOME} className={secondaryButton}>{t("members.invitation.accept.home")}</Link>
          </div>
        </div>,
      );
    case "accepted":
      return shell(
        <div role="status">
          {icon(<FiCheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />, "bg-emerald-100 dark:bg-emerald-900/30")}
          <h1 className="text-xl font-bold">{t("members.invitation.accept.acceptedTitle")}</h1>
          <p className="mt-2 text-sm app-text-muted">{t("members.invitation.accept.acceptedBody", { role: roleLabel(phase.role) })}</p>
          <Link to={PATHS.EVENT_MANAGE(phase.eventId)} className={`${primaryButton} mt-6`}>
            {t("members.invitation.accept.openEvent")}
          </Link>
        </div>,
      );
    case "declined":
      return shell(
        <div role="status">
          {icon(<FiXCircle className="h-8 w-8 text-slate-500" aria-hidden="true" />, "bg-slate-100 dark:bg-slate-800")}
          <h1 className="text-xl font-bold">{t("members.invitation.accept.declinedTitle")}</h1>
          <p className="mt-2 text-sm app-text-muted">{t("members.invitation.accept.declinedBody")}</p>
          <Link to={PATHS.HOME} className={`${secondaryButton} mt-6`}>{t("members.invitation.accept.home")}</Link>
        </div>,
      );
    case "ready": {
      const { invitation } = phase;
      return shell(
        <>
          {icon(<FiMail className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />, "bg-blue-100 dark:bg-blue-900/30")}
          <h1 className="text-xl font-bold">{t("members.invitation.accept.title")}</h1>
          <dl className="mt-5 space-y-3 text-left text-sm">
            <div className="flex justify-between gap-4"><dt className="app-text-muted">{t("members.invitation.accept.event")}</dt><dd className="text-right font-semibold">{invitation.eventTitle}</dd></div>
            <div className="flex justify-between gap-4"><dt className="app-text-muted">{t("members.invitation.accept.role")}</dt><dd className="text-right font-semibold">{roleLabel(invitation.role)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="app-text-muted">{t("members.invitation.accept.expires")}</dt><dd className="text-right font-semibold">{new Date(invitation.expiresAt).toLocaleString()}</dd></div>
          </dl>
          <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row" aria-live="polite">
            <button type="button" disabled={busy !== null} onClick={() => void respond("decline")} className={secondaryButton}>
              {busy === "decline" && <FiLoader className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              {busy === "decline" ? t("members.invitation.accept.declining") : t("members.invitation.accept.decline")}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => void respond("accept")} className={primaryButton}>
              {busy === "accept" && <FiLoader className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              {busy === "accept" ? t("members.invitation.accept.accepting") : t("members.invitation.accept.accept")}
            </button>
          </div>
        </>,
      );
    }
  }
}
