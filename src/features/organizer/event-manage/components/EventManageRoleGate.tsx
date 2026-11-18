import React from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import type { EventManageContext } from "../eventManageRoles";

/** Lấy context do layout quản lý sự kiện cung cấp qua outlet; không có thì trả đối tượng rỗng. */
function useManageContext(): Partial<EventManageContext> {
  return useOutletContext<Partial<EventManageContext> | null>() ?? {};
}

/** Khối giữ chỗ (đánh dấu {@code aria-busy}) hiển thị trong lúc chưa biết vai trò của người dùng. */
function Waiting() {
  return <div className="min-h-50" aria-busy="true" />;
}

/** Trả trang chủ của khu quản lý theo vai trò: nhân viên check-in chỉ có trang check-in, các vai trò khác vào tổng quan. */
function homeFor(role: string, eventId: string | undefined): string {
  const base = `/organizer/events/${eventId}/manage`;
  return role === "CHECKIN_STAFF" ? `${base}/checkin` : `${base}/overview`;
}

/** Trang gốc của khu quản lý sự kiện: nhân viên check-in chuyển thẳng tới check-in (không gọi thống kê), các vai trò khác tới tổng quan. */
export const EventManageIndexRedirect: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { myRole, myRoleLoaded } = useManageContext();
  if (!myRoleLoaded) return <Waiting />;
  return <Navigate to={myRole ? homeFor(myRole, eventId) : `/organizer/events/${eventId}/manage/overview`} replace />;
};

/** Chỉ cho các vai trò trong {@code allow} xem {@code children}; chờ khi chưa biết vai trò, vai trò không đủ quyền thì chuyển về trang chủ của vai trò đó. */
export const EventManageRoleGate: React.FC<{ allow: string[]; children: React.ReactElement }> = ({ allow, children }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const { myRole, myRoleLoaded } = useManageContext();
  if (!myRoleLoaded) return <Waiting />;
  if (myRole && !allow.includes(myRole)) return <Navigate to={homeFor(myRole, eventId)} replace />;
  return children;
};
