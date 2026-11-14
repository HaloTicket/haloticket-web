// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScannerPanel } from "../../src/features/organizer/event-manage/ScannerPanel";
import { SCAN_REPEAT_WINDOW_MS, cameraErrorState } from "../../src/features/organizer/event-manage/scannerSupport";

// The camera library is replaced: no real camera is opened. `emit` plays a code read by the camera.
const lib = vi.hoisted(() => ({
  hasCamera: vi.fn(async () => true),
  start: vi.fn(async () => {}),
  stop: vi.fn(),
  destroy: vi.fn(),
  onDecode: null as null | ((r: { data: string }) => void),
}));

vi.mock("qr-scanner", () => ({
  default: class FakeQrScanner {
    static hasCamera = lib.hasCamera;
    constructor(_video: unknown, onDecode: (r: { data: string }) => void) { lib.onDecode = onDecode; }
    start = lib.start;
    stop = lib.stop;
    destroy = lib.destroy;
  },
}));

const emit = (data: string) => act(() => { lib.onDecode?.({ data }); });

beforeEach(() => {
  lib.hasCamera.mockReset().mockResolvedValue(true);
  lib.start.mockReset().mockResolvedValue(undefined);
  lib.stop.mockReset();
  lib.destroy.mockReset();
  lib.onDecode = null;
  vi.useRealTimers();
});
afterEach(cleanup);

async function open() {
  fireEvent.click(screen.getByRole("button", { name: /Quét bằng camera/ }));
  await waitFor(() => expect(lib.start).toHaveBeenCalled());
}

describe("camera scanner panel", () => {
  it("does not open the camera until the person asks", () => {
    render(<ScannerPanel onScan={() => {}} />);
    expect(lib.start).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Quét bằng camera/ })).toBeTruthy();
  });

  it("sends a code once and ignores the same code read again within the window", async () => {
    const onScan = vi.fn();
    render(<ScannerPanel onScan={onScan} />);
    await open();
    emit("TICKET-1");
    emit("TICKET-1");
    emit("TICKET-1");
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith("TICKET-1");
    emit("TICKET-2");
    expect(onScan).toHaveBeenCalledTimes(2);
  });

  it("accepts the same code again after the window", async () => {
    const onScan = vi.fn();
    render(<ScannerPanel onScan={onScan} />);
    await open();
    const start = Date.now();
    const spy = vi.spyOn(Date, "now");
    spy.mockReturnValue(start);
    emit("TICKET-1");
    spy.mockReturnValue(start + SCAN_REPEAT_WINDOW_MS + 1);
    emit("TICKET-1");
    expect(onScan).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("drops codes read while the page is busy with the last scan", async () => {
    const onScan = vi.fn();
    const { rerender } = render(<ScannerPanel onScan={onScan} busy />);
    await open();
    emit("TICKET-1");
    expect(onScan).not.toHaveBeenCalled();
    rerender(<ScannerPanel onScan={onScan} busy={false} />);
    emit("TICKET-1");
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it("stops the camera when switched off and when the page is left", async () => {
    const { unmount } = render(<ScannerPanel onScan={() => {}} />);
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Tắt camera/ }));
    expect(lib.stop).toHaveBeenCalledTimes(1);
    expect(lib.destroy).toHaveBeenCalledTimes(1);

    await open();
    unmount();
    expect(lib.stop).toHaveBeenCalledTimes(2);
    expect(lib.destroy).toHaveBeenCalledTimes(2);
  });

  it("tells the person when the device has no camera", async () => {
    lib.hasCamera.mockResolvedValue(false);
    render(<ScannerPanel onScan={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Quét bằng camera/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/không có camera/);
    expect(lib.start).not.toHaveBeenCalled();
  });

  it("tells the person when the browser refuses the camera", async () => {
    lib.start.mockRejectedValue(Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }));
    render(<ScannerPanel onScan={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Quét bằng camera/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/chưa cho phép dùng camera/);
    expect(lib.destroy).toHaveBeenCalled();
  });
});

describe("camera error mapping", () => {
  it("maps browser errors to what the person can do", () => {
    expect(cameraErrorState({ name: "NotAllowedError" })).toBe("denied");
    expect(cameraErrorState(new Error("Permission dismissed"))).toBe("denied");
    expect(cameraErrorState({ name: "NotFoundError" })).toBe("no-camera");
    expect(cameraErrorState("Camera not found.")).toBe("no-camera");
    expect(cameraErrorState({ name: "AbortError" })).toBe("error");
    expect(cameraErrorState(null)).toBe("error");
  });
});
