import React, { useState, useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { eventApi } from "@/services/eventApi";
import { EventManageSidebar } from "@/features/organizer/event-manage/components/EventManageSidebar";
import { EventManageHeader } from "@/features/organizer/event-manage/components/EventManageHeader";
import { OrganizerAIChatWidget } from "@/components/common/OrganizerAIChatWidget/OrganizerAIChatWidget";

export const EventManageLayout: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [eventData, setEventData] = useState<Record<string, unknown> | null>(null);
  const [roleState, setRoleState] = useState<{ eventId: string; role: string | null } | null>(null);
  const current = roleState !== null && roleState.eventId === eventId ? roleState : null;
  const myRoleLoaded = current !== null;
  const myRole = current ? current.role : null;

  useEffect(() => {
    if (eventId) {
      eventApi.getEventById(eventId).then((data) => {
        if (data) setEventData(data);
      });
      eventApi.getMyRoleInEvent(eventId).then((role) => {
        setRoleState({ eventId, role });
      });
    }
  }, [eventId]);

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
          <Outlet context={{ myRole, myRoleLoaded, eventData }} />
        </main>
      </div>

      {/* Floating Organizer AI Data Assistant Chatbot with Event Context */}
      <OrganizerAIChatWidget 
        eventId={eventId} 
        eventTitle={(eventData?.title as string) || undefined} 
      />
    </div>
  );
};

export default EventManageLayout;
