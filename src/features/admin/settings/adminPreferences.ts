import { useEffect, useState } from "react";

import type { UserProfile } from "@/types";

export interface AdminPreferences {
  hideEmail: boolean;
  instantNotifications: boolean;
}

const defaults: AdminPreferences = { hideEmail: false, instantNotifications: true };
const prefix = "haloticket_admin_preferences:";
const changedEvent = "admin-preferences-changed";
const storageError = "Không thể lưu cài đặt trên trình duyệt này. Vui lòng kiểm tra quyền lưu trữ và thử lại.";
const invalidError = "Cài đặt đã lưu không hợp lệ. Giá trị mặc định đang được sử dụng; hãy chọn lại để lưu.";

export function preferenceIdentity(profile: UserProfile | null): string | null {
  return profile?.keycloakId || profile?.id || profile?.email?.toLowerCase() || null;
}

export function preferenceKey(identity: string): string {
  return `${prefix}${encodeURIComponent(identity)}`;
}

export function readAdminPreferences(identity: string | null): { preferences: AdminPreferences; error: string | null } {
  if (!identity) return { preferences: defaults, error: null };
  try {
    const raw = localStorage.getItem(preferenceKey(identity));
    if (raw === null) return { preferences: defaults, error: null };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null &&
      "hideEmail" in parsed && typeof parsed.hideEmail === "boolean" &&
      "instantNotifications" in parsed && typeof parsed.instantNotifications === "boolean") {
      return { preferences: { hideEmail: parsed.hideEmail, instantNotifications: parsed.instantNotifications }, error: null };
    }
    return { preferences: defaults, error: invalidError };
  } catch (error) {
    return { preferences: defaults, error: error instanceof SyntaxError ? invalidError : storageError };
  }
}

export function writeAdminPreferences(identity: string, preferences: AdminPreferences): string | null {
  try {
    localStorage.setItem(preferenceKey(identity), JSON.stringify(preferences));
    window.dispatchEvent(new Event(changedEvent));
    return null;
  } catch {
    return storageError;
  }
}

export function useAdminPreferences(identity: string | null) {
  const [stored, setStored] = useState(() => ({ identity, ...readAdminPreferences(identity) }));
  const state = stored.identity === identity ? stored : readAdminPreferences(identity);

  useEffect(() => {
    const refresh = () => setStored({ identity, ...readAdminPreferences(identity) });
    refresh();
    window.addEventListener(changedEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(changedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [identity]);

  const update = (key: keyof AdminPreferences, value: boolean) => {
    if (!identity) return;
    const next = { ...readAdminPreferences(identity).preferences, [key]: value };
    const error = writeAdminPreferences(identity, next);
    if (error) setStored({ identity, preferences: state.preferences, error });
    else setStored({ identity, preferences: next, error: null });
  };

  return { ...state, update };
}
