export interface MemberItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "CHECKIN_STAFF";
  status: "ACTIVE" | "PENDING";
  addedAt: string;
}
