import React from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import type { EventManageContext } from "../eventManageRoles";

function useManageContext(): Partial<EventManageContext> {
  return useOutletContext<Partial<EventManageContext> | null>() ?? {};
}

function Waiting() {
  return <div className="min-h-50" aria-busy="true" />;
}

// Check-in staff only have the check-in page
function homeFor(role: string, eventId: string | undefined): string {
  const base = `/organizer/events/${eventId}/manage`;
  return role === "CHECKIN_STAFF" ? `${base}/checkin` : `${base}/overview`;
}

// manage itself: check-in staff go straight to check-in (no statistics call), everyone else to the overview.
export const EventManageIndexRedirect: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { myRole, myRoleLoaded } = useManageContext();
  if (!myRoleLoaded) return <Waiting />;
  return <Navigate to={myRole ? homeFor(myRole, eventId) : `/organizer/events/${eventId}/manage/overview`} replace />;
};

export const EventManageRoleGate: React.FC<{ allow: string[]; children: React.ReactElement }> = ({ allow, children }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const { myRole, myRoleLoaded } = useManageContext();
  if (!myRoleLoaded) return <Waiting />;
  if (myRole && !allow.includes(myRole)) return <Navigate to={homeFor(myRole, eventId)} replace />;
  return children;
};
