export interface GoogleAccountSuggestion {
  name: string;
  email: string;
  picture?: string;
  avatarUrl?: string;
}

export const LAST_GOOGLE_ACCOUNT_KEY = "haloticket_last_google_account";

/** Clean up platform-appended suffixes like " HaloTicket" */
export function cleanDisplayName(rawName?: string, email?: string): string {
  if (!rawName) return email ? email.split("@")[0] : "";
  let name = rawName.trim();
  name = name.replace(/\s+HaloTicket$/i, "").trim();
  if (!name && email) {
    name = email.split("@")[0];
  }
  return name;
}

let cachedSnapshot: GoogleAccountSuggestion | null = null;
let lastGoogleRaw: string | null = null;
let lastProfileRaw: string | null = null;
let initialized = false;

function computeSnapshot(): GoogleAccountSuggestion | null {
  if (typeof window === "undefined") return null;

  try {
    const googleRaw = localStorage.getItem(LAST_GOOGLE_ACCOUNT_KEY);
    const profileRaw = localStorage.getItem("haloticket_user_profile");

    if (initialized && googleRaw === lastGoogleRaw && profileRaw === lastProfileRaw) {
      return cachedSnapshot;
    }

    initialized = true;
    lastGoogleRaw = googleRaw;
    lastProfileRaw = profileRaw;

    if (googleRaw) {
      try {
        const parsed = JSON.parse(googleRaw);
        if (parsed && typeof parsed.email === "string") {
          cachedSnapshot = {
            ...parsed,
            name: cleanDisplayName(parsed.name, parsed.email),
            picture: parsed.picture || parsed.avatarUrl,
            avatarUrl: parsed.picture || parsed.avatarUrl,
          };
          return cachedSnapshot;
        }
      } catch {
        // invalid JSON
      }
    }

    if (profileRaw) {
      try {
        const profile = JSON.parse(profileRaw);
        if (profile?.email) {
          cachedSnapshot = {
            name: cleanDisplayName(profile.fullName || profile.email.split("@")[0], profile.email),
            email: profile.email,
            picture: profile.avatarUrl,
            avatarUrl: profile.avatarUrl,
          };
          return cachedSnapshot;
        }
      } catch {
        // invalid JSON
      }
    }

    cachedSnapshot = null;
    return null;
  } catch {
    return cachedSnapshot;
  }
}

export function getSavedGoogleAccount(): GoogleAccountSuggestion | null {
  return computeSnapshot();
}

export function saveLastGoogleAccount(account: GoogleAccountSuggestion): void {
  try {
    const cleaned: GoogleAccountSuggestion = {
      ...account,
      name: cleanDisplayName(account.name, account.email),
      picture: account.picture || account.avatarUrl,
      avatarUrl: account.picture || account.avatarUrl,
    };
    const serialized = JSON.stringify(cleaned);
    lastGoogleRaw = serialized;
    cachedSnapshot = cleaned;
    localStorage.setItem(LAST_GOOGLE_ACCOUNT_KEY, serialized);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("google-account-updated", { detail: cleaned }));
    }
  } catch {
    // ignore
  }
}

export function subscribeGoogleAccount(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    callback();
  };
  window.addEventListener("google-account-updated", handler);
  window.addEventListener("storage", handler);
  window.addEventListener("auth-changed", handler);
  window.addEventListener("user-updated", handler);

  return () => {
    window.removeEventListener("google-account-updated", handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("auth-changed", handler);
    window.removeEventListener("user-updated", handler);
  };
}

