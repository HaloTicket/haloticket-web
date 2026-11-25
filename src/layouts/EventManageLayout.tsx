import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useParams } from "react-router-dom";
import { eventApi } from "@/services/eventApi";
import { EventManageSidebar } from "@/features/organizer/event-manage/components/EventManageSidebar";
import { EventManageHeader } from "@/features/organizer/event-manage/components/EventManageHeader";
import { EVENT_TICKETS_SYNC_CHANGED } from "@/utils/eventSaveErrors";
import { TicketsSyncBanner, type TicketsSync } from "@/features/organizer/event-manage/components/TicketsSyncBanner";
import { OrganizerAIChatWidget } from "@/components/common/OrganizerAIChatWidget/OrganizerAIChatWidget";
import { useOrganizerChatSubject } from "@/components/common/OrganizerAIChatWidget/organizerChatStorage";
import { VIEW_ACCESS_ROLES } from "@/features/organizer/event-manage/eventManageRoles";
import { isAdminToken } from "@/utils/adminAccess";

/** Bố cục trang quản lý một sự kiện của ban tổ chức: tải sự kiện theo `eventId` và vai trò của người dùng trong sự kiện, hiển thị thanh bên và nội dung trang con. */
export const EventManageLayout: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const subject = useOrganizerChatSubject();
  const [eventState, setEventState] = useState<{
    eventId: string;
    subject: string | null;
    data: Record<string, unknown>;
  } | null>(null);
  const [roleState, setRoleState] = useState<{ eventId: string; subject: string | null; role: string | null } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const eventData = eventState && eventState.eventId === eventId && eventState.subject === subject
    ? eventState.data
    : null;
  const current = roleState && roleState.eventId === eventId && roleState.subject === subject ? roleState : null;
  const myRoleLoaded = current !== null;
  const myRole = current ? current.role : null;
  const hasManagementPermission = myRoleLoaded && (isAdminToken() || (myRole !== null && VIEW_ACCESS_ROLES.includes(myRole)));

  /** Tải lại dữ liệu sự kiện; cũng được gọi khi đồng bộ vé của sự kiện thay đổi. */
  const refreshEvent = useCallback(() => {
    setRefreshVersion(version => version + 1);
  }, []);

  useEffect(() => {
    window.addEventListener(EVENT_TICKETS_SYNC_CHANGED, refreshEvent);
    return () => window.removeEventListener(EVENT_TICKETS_SYNC_CHANGED, refreshEvent);
  }, [refreshEvent]);

  useEffect(() => {
    if (!eventId) return;
    let isCurrent = true;
    eventApi.getEventById(eventId).then((data) => {
      if (isCurrent && data) setEventState({ eventId, subject, data });
    });
    return () => {
      isCurrent = false;
    };
  }, [eventId, refreshVersion, subject]);

  useEffect(() => {
    if (!eventId) return;
    let isCurrent = true;
    eventApi.getMyRoleInEvent(eventId).then((role) => {
      if (isCurrent) setRoleState({ eventId, subject, role });
    });
    return () => {
      isCurrent = false;
    };
  }, [eventId, subject]);

  return (
    <div className="min-h-screen flex app-bg-page transition-colors duration-300 font-sans antialiased">
      {/* Left Sidebar Navigation */}
      <EventManageSidebar
        eventData={eventData}
        myRole={myRole}
        isSidebarOpen={isSidebarOpen}
        isCollapsed={isCollapsed}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Right Content Section */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <EventManageHeader
          eventData={eventData}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Dynamic Page Content View */}
        <main className="flex-1 px-4 py-2 md:px-8 md:py-6 overflow-y-auto">
          {eventId && <TicketsSyncBanner eventId={eventId} ticketsSync={eventData?.ticketsSync as TicketsSync | undefined} onResynced={refreshEvent} />}
          <Outlet context={{ myRole, myRoleLoaded, eventData }} />
        </main>
      </div>

      {/* Floating Organizer AI Data Assistant Chatbot with Event Context */}
      {hasManagementPermission && (
        <OrganizerAIChatWidget
          eventId={eventId}
          eventTitle={(eventData?.title as string) || undefined}
          scope="event"
        />
      )}
    </div>
  );
};

export default EventManageLayout;
