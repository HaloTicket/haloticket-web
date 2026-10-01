import { toast } from "sonner";

let activeUser: string | null = null;
const seen = new Set<string>();
const recentContentKeys = new Map<string, number>();

export function resetNotificationToastSession() {
  seen.clear();
  recentContentKeys.clear();
  activeUser = null;
}

export function claimNotificationToast(userId: string, notificationId: string, contentKey?: string): string | null {
  if (activeUser !== userId) {
    if (activeUser !== null) toast.dismiss();
    seen.clear();
    recentContentKeys.clear();
    activeUser = userId;
  }
  const id = `${userId}:${notificationId}`;
  if (seen.has(id)) return null;

  if (contentKey) {
    const now = Date.now();
    for (const [key, timestamp] of recentContentKeys.entries()) {
      if (now - timestamp > 6000) {
        recentContentKeys.delete(key);
      }
    }
    const fullKey = `${userId}:${contentKey}`;
    if (recentContentKeys.has(fullKey)) {
      seen.add(id);
      return null;
    }
    recentContentKeys.set(fullKey, now);
  }

  seen.add(id);
  return id;
}
