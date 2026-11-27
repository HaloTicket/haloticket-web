import React from "react";

/**
 * Ảnh nền sidebar khu vực Ban tổ chức tự chuyển sáng/tối theo lớp `.dark`,
 * đặt trong phần thân trên thanh chọn ngôn ngữ để phần sân khấu phía dưới luôn hiển thị rõ ràng.
 */
export const OrganizerSidebarBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      <img
        src="/assets/sidebar/organizer-sidebar-light.jpg"
        alt=""
        width={342}
        height={1024}
        decoding="async"
        draggable={false}
        className="block dark:hidden h-full w-full object-cover object-bottom"
      />
      <img
        src="/assets/sidebar/organizer-sidebar-dark.jpg"
        alt=""
        width={342}
        height={1024}
        decoding="async"
        draggable={false}
        className="hidden dark:block h-full w-full object-cover object-bottom"
      />
    </div>
  );
};

export default OrganizerSidebarBackground;

