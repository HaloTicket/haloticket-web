import { useOutletContext } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import { adminNotificationTarget } from '@/utils/adminNotificationTarget';
import type { NotificationItem } from '@/types';
export interface AdminNotificationContext {
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
export default function AdminNotifications() {
  const state = useOutletContext<AdminNotificationContext>();
  return <div className="space-y-6"><AdminPageHeader title="Thông báo" description="Theo dõi cập nhật và xem lại lịch sử thông báo quản trị." /><NotificationInbox notifications={state.notifications} loading={state.loading} error={state.error} onRetry={() => void state.reload()} onNotificationClick={item => void state.markAsRead(item.id)} onMarkAllAsRead={state.markAllAsRead} getTarget={adminNotificationTarget} /></div>;
}
