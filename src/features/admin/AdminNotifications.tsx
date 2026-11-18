import { useOutletContext } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import { adminNotificationTarget } from '@/utils/adminNotificationTarget';
import type { NotificationItem } from '@/types';
/** Context mà layout admin truyền xuống qua `Outlet`: danh sách thông báo, trạng thái tải/lỗi và các hàm tải lại, đánh dấu đã đọc. */
export interface AdminNotificationContext {
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
/** Trang thông báo của admin: hộp thư thông báo; bấm vào một thông báo sẽ đánh dấu đã đọc, liên kết đích lấy từ `adminNotificationTarget`. */
export default function AdminNotifications() {
  const state = useOutletContext<AdminNotificationContext>();
  return <div className="space-y-6"><AdminPageHeader title="Thông báo" description="Theo dõi cập nhật và xem lại lịch sử thông báo quản trị." /><NotificationInbox notifications={state.notifications} loading={state.loading} error={state.error} onRetry={() => void state.reload()} onNotificationClick={item => void state.markAsRead(item.id)} onMarkAllAsRead={state.markAllAsRead} getTarget={adminNotificationTarget} /></div>;
}
