export interface EventManageContext {
  myRole: string | null;
  myRoleLoaded: boolean;
  eventData: Record<string, unknown> | null;
}

export const FULL_ACCESS_ROLES = ["OWNER", "ADMIN"];
export const VIEW_ACCESS_ROLES = ["OWNER", "ADMIN", "MANAGER"];
