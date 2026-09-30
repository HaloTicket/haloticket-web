import { toast } from "sonner";

let activeUser: string | null = null;
const seen = new Set<string>();

export function resetNotificationToastSession() {
  seen.clear();
  activeUser = null;
}

export function claimNotificationToast(userId: string, notificationId: string): string | null {
  if (activeUser !== userId) {
    if (activeUser !== null) toast.dismiss();
    seen.clear();
    activeUser = userId;
  }
  const id = `${userId}:${notificationId}`;
  if (seen.has(id)) return null;
  seen.add(id);
  return id;
}
