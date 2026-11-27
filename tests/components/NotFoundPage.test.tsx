// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { setLanguage } from "@/i18n";
import NotFound from "@/features/common/NotFound";
import { PATHS } from "@/routes/paths";

function mockMatchMedia(reducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderNotFound(initialEntry = "/non-existent-route", initialTheme?: "light" | "dark") {
  if (initialTheme) {
    localStorage.setItem("halo_theme", initialTheme);
  }
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path={PATHS.HOME} element={<div>HOME_PAGE_TARGET</div>} />
          <Route path={PATHS.EVENTS} element={<div>EVENTS_PAGE_TARGET</div>} />
          <Route path={PATHS.NOT_FOUND} element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  mockMatchMedia(false);
  document.documentElement.classList.remove("dark");
});

afterEach(async () => {
  vi.useRealTimers();
  cleanup();
  await setLanguage("vi");
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("NotFoundPage (HaloBot Walk -> Trip -> Lost)", () => {
  it("progresses from walking -> tripping -> lost reveal and renders only theme-matched lost assets", () => {
    vi.useFakeTimers();
    const { container, unmount } = renderNotFound("/unknown-page", "light");

    // Stage 1: Walking
    expect(screen.getByAltText("HaloBoo đang bước đi xem bản đồ")).toBeTruthy();
    expect(container.querySelector(".notfound-bot-walk")).toBeTruthy();
    expect(
      screen.queryByAltText("HaloBoo đang ngồi cầm bản đồ với biểu cảm ngơ ngác vì bị lạc đường")
    ).toBeNull();

    // Stage 2: Tripping (after 1150ms)
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(container.querySelector(".notfound-bot-trip")).toBeTruthy();

    // Stage 3: Lost reveal (after 1750ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });
    const lightSrcs = Array.from(container.querySelectorAll("img")).map((img) =>
      img.getAttribute("src")
    );
    expect(lightSrcs).toContain("/assets/404/404-background-light.png");
    expect(lightSrcs).toContain("/assets/404/404-bot-light.png");
    expect(lightSrcs).not.toContain("/assets/404/404-bot-walk.png");
    expect(lightSrcs).not.toContain("/assets/404/404-background-dark.png");
    expect(lightSrcs).not.toContain("/assets/404/404-bot-dark.png");

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Oops! Bạn đã lạc đường.");
    const mascotName = screen.getByText("HaloBoo");
    expect(mascotName.tagName).toBe("STRONG");
    expect(mascotName.parentElement?.textContent).toBe("Có vẻ HaloBoo cũng đã mất phương hướng!");
    expect(
      screen.getByText("Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.")
    ).toBeTruthy();
    unmount();

    // Dark mode settled lost state
    const darkRender = renderNotFound("/unknown-page", "dark");
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    const darkSrcs = Array.from(darkRender.container.querySelectorAll("img")).map((img) =>
      img.getAttribute("src")
    );
    expect(darkSrcs).toContain("/assets/404/404-background-dark.png");
    expect(darkSrcs).toContain("/assets/404/404-bot-dark.png");
    expect(darkSrcs).not.toContain("/assets/404/404-background-light.png");
    expect(darkSrcs).not.toContain("/assets/404/404-bot-light.png");
  });

  it("skips directly to settled lost state when prefers-reduced-motion is enabled", () => {
    mockMatchMedia(true);
    const { container } = renderNotFound("/unknown-page", "light");

    expect(
      screen.getByAltText("HaloBoo đang ngồi cầm bản đồ với biểu cảm ngơ ngác vì bị lạc đường")
    ).toBeTruthy();
    expect(container.querySelector(".notfound-bot-walk")).toBeNull();
    expect(container.querySelector(".notfound-bot-land")).toBeNull();
  });

  it("switches walking and lost copy to English when language is en", async () => {
    vi.useFakeTimers();
    await setLanguage("en");
    renderNotFound("/unknown-page", "light");

    expect(screen.getByAltText("HaloBoo walking happily while looking at a map")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Oops! You've lost your way.");
    const mascotName = screen.getByText("HaloBoo");
    expect(mascotName.tagName).toBe("STRONG");
    expect(mascotName.parentElement?.textContent).toBe("Looks like HaloBoo got lost too!");
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Back to home/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Explore events/i })).toBeTruthy();
    expect(
      screen.getByAltText("HaloBoo sitting with a map looking confused and lost in space")
    ).toBeTruthy();
  });

  it("marks decorative layers with aria-hidden and pointer-events-none", () => {
    mockMatchMedia(true);
    const { container } = renderNotFound("/unknown-page", "light");
    const bgImg = container.querySelector('img[src="/assets/404/404-background-light.png"]');
    const bgWrapper = bgImg?.parentElement;
    expect(bgWrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(bgWrapper?.className).toContain("pointer-events-none");

    const hiddenDecorations = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenDecorations.length).toBeGreaterThanOrEqual(4);
  });

  it("navigates via SPA router when clicking primary and secondary action buttons", () => {
    mockMatchMedia(true);
    renderNotFound("/unknown-page", "light");
    fireEvent.click(screen.getByRole("button", { name: /Về trang chủ/i }));
    expect(screen.getByText("HOME_PAGE_TARGET")).toBeTruthy();

    cleanup();
    renderNotFound("/another-unknown", "light");
    fireEvent.click(screen.getByRole("button", { name: /Khám phá sự kiện/i }));
    expect(screen.getByText("EVENTS_PAGE_TARGET")).toBeTruthy();
  });

  it("renders admin 404 variant in VI/EN and navigates to admin dashboard or previous page", async () => {
    mockMatchMedia(true);
    localStorage.setItem("halo_theme", "dark");
    const { container } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/admin/users", "/admin/non-existent"]} initialIndex={1}>
          <Routes>
            <Route path="/admin/users" element={<div>ADMIN_PREV_TARGET</div>} />
            <Route path={PATHS.ADMIN_DASHBOARD} element={<div>ADMIN_DASHBOARD_TARGET</div>} />
            <Route path="/admin/*" element={<NotFound variant="admin" />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    const section = container.querySelector("section");
    expect(section?.className).toContain("rounded-2xl");
    expect(screen.getByRole("button", { name: /Về trang quản trị/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Quay lại trang trước/i })).toBeTruthy();

    // Verify dark mode assets are used in admin 404
    const darkSrcs = Array.from(container.querySelectorAll("img")).map((img) =>
      img.getAttribute("src")
    );
    expect(darkSrcs).toContain("/assets/404/404-background-dark.png");
    expect(darkSrcs).toContain("/assets/404/404-bot-dark.png");

    // English i18n check
    await setLanguage("en");
    expect(screen.getByRole("button", { name: /Back to admin dashboard/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Go back/i })).toBeTruthy();

    // Primary button -> /admin/dashboard
    fireEvent.click(screen.getByRole("button", { name: /Back to admin dashboard/i }));
    expect(screen.getByText("ADMIN_DASHBOARD_TARGET")).toBeTruthy();

    // Secondary button -> back (-1)
    cleanup();
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/admin/users", "/admin/non-existent"]} initialIndex={1}>
          <Routes>
            <Route path="/admin/users" element={<div>ADMIN_PREV_TARGET</div>} />
            <Route path={PATHS.ADMIN_DASHBOARD} element={<div>ADMIN_DASHBOARD_TARGET</div>} />
            <Route path="/admin/*" element={<NotFound variant="admin" />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /Go back/i }));
    expect(screen.getByText("ADMIN_PREV_TARGET")).toBeTruthy();
  });
});
