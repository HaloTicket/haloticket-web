export interface GoogleAccountSuggestion {
  name: string;
  email: string;
  picture?: string;
  avatarUrl?: string;
  provider?: "google";
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
let initialized = false;

function getStoredGooglePicture(account: GoogleAccountSuggestion): string | undefined {
  const picture = account.picture || account.avatarUrl;
  if (!picture) return undefined;
  if (account.provider === "google") return picture;

  try {
    const hostname = new URL(picture).hostname.toLowerCase();
    return hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com")
      ? picture
      : undefined;
  } catch {
    return undefined;
  }
}

function computeSnapshot(): GoogleAccountSuggestion | null {
  if (typeof window === "undefined") return null;

  try {
    const googleRaw = localStorage.getItem(LAST_GOOGLE_ACCOUNT_KEY);

    if (initialized && googleRaw === lastGoogleRaw) {
      return cachedSnapshot;
    }

    initialized = true;
    lastGoogleRaw = googleRaw;

    if (googleRaw) {
      try {
        const parsed = JSON.parse(googleRaw) as GoogleAccountSuggestion;
        if (parsed && typeof parsed.email === "string") {
          const picture = getStoredGooglePicture(parsed);
          cachedSnapshot = {
            ...parsed,
            name: cleanDisplayName(parsed.name, parsed.email),
            picture,
            avatarUrl: picture,
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
      provider: "google",
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

  return () => {
    window.removeEventListener("google-account-updated", handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("auth-changed", handler);
  };
}

