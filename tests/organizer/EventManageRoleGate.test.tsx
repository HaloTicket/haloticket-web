// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { EventManageIndexRedirect, EventManageRoleGate } from "@/features/organizer/event-manage/components/EventManageRoleGate";
import { FULL_ACCESS_ROLES, VIEW_ACCESS_ROLES } from "@/features/organizer/event-manage/eventManageRoles";

afterEach(cleanup);

function renderAt(path: string, myRole: string | null, myRoleLoaded = true) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/events/:eventId/manage" element={<Outlet context={{ myRole, myRoleLoaded, eventData: null }} />}>
          <Route index element={<EventManageIndexRedirect />} />
          <Route path="overview" element={<EventManageRoleGate allow={VIEW_ACCESS_ROLES}><p>overview page</p></EventManageRoleGate>} />
          <Route path="vouchers" element={<EventManageRoleGate allow={FULL_ACCESS_ROLES}><p>vouchers page</p></EventManageRoleGate>} />
          <Route path="checkin" element={<p>checkin page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const base = "/organizer/events/e1/manage";

it("sends check-in staff from the manage root straight to check-in", () => {
  renderAt(base, "CHECKIN_STAFF");
  expect(screen.getByText("checkin page")).toBeTruthy();
});

it.each(["OWNER", "ADMIN", "MANAGER"])("sends %s from the manage root to the overview", (role) => {
  renderAt(base, role);
  expect(screen.getByText("overview page")).toBeTruthy();
});

it("keeps check-in staff out of the overview and the vouchers page", () => {
  renderAt(`${base}/overview`, "CHECKIN_STAFF");
  expect(screen.getByText("checkin page")).toBeTruthy();
  cleanup();
  renderAt(`${base}/vouchers`, "CHECKIN_STAFF");
  expect(screen.getByText("checkin page")).toBeTruthy();
});

it("sends a manager away from vouchers to the overview but lets owner and admin in", () => {
  renderAt(`${base}/vouchers`, "MANAGER");
  expect(screen.getByText("overview page")).toBeTruthy();
  cleanup();
  renderAt(`${base}/vouchers`, "OWNER");
  expect(screen.getByText("vouchers page")).toBeTruthy();
  cleanup();
  renderAt(`${base}/vouchers`, "ADMIN");
  expect(screen.getByText("vouchers page")).toBeTruthy();
});

it("does not redirect before the role is known, and lets an unknown role through (the server decides)", () => {
  renderAt(`${base}/vouchers`, null, false);
  expect(screen.queryByText("vouchers page")).toBeNull();
  expect(screen.queryByText("checkin page")).toBeNull();
  cleanup();
  renderAt(`${base}/vouchers`, null, true);
  expect(screen.getByText("vouchers page")).toBeTruthy();
});
