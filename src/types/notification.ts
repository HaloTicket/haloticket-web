export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readStatus?: boolean;
  createdAt?: string;
  /** JSON text; event approval notifications carry {eventId, link, flaggedFields} (absent on older ones). */
  variablesJson?: string | null;
}
