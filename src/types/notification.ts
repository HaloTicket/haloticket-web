export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readStatus?: boolean;
  createdAt?: string;
}
