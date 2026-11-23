import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useLiveScan } from "./useLiveScan";

describe("useLiveScan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes enabled by default", () => {
    const { isLiveScanEnabled, scanStatus } = useLiveScan();
    expect(isLiveScanEnabled.value).toBe(true);
    expect(scanStatus.value).toBe("idle");
  });

  it("toggles enabled state and updates localStorage", () => {
    const { isLiveScanEnabled, toggleLiveScan } = useLiveScan();
    toggleLiveScan();
    expect(isLiveScanEnabled.value).toBe(false);
    expect(localStorage.getItem("devmate_live_scan")).toBe("false");

    toggleLiveScan();
    expect(isLiveScanEnabled.value).toBe(true);
    expect(localStorage.getItem("devmate_live_scan")).toBe("true");
  });

  it("debounces scan requests and runs callback with results", async () => {
    const { scheduleScan, scanStatus } = useLiveScan(200);
    const callback = vi.fn();

    scheduleScan("eval('danger');", "javascript", "test.js", callback);
    expect(scanStatus.value).toBe("debouncing");

    // Fast-forward debounce timer
    vi.advanceTimersByTime(200);
    // Fast-forward microtasks / setTimeout(..., 0)
    vi.runAllTimers();

    expect(callback).toHaveBeenCalledTimes(1);
    const result = callback.mock.calls[0][0];
    expect(result.findings.some((f: any) => f.ruleId === "security-eval")).toBe(true);
    expect(scanStatus.value).toBe("ready");
  });

  it("resets debouncing if subsequent scan is scheduled before timer fires", () => {
    const { scheduleScan, scanStatus } = useLiveScan(300);
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    scheduleScan("const a = 1;", "javascript", "test.js", callback1);
    vi.advanceTimersByTime(150);

    // Keystroke arrives before 300ms
    scheduleScan("const a = 2;", "javascript", "test.js", callback2);
    expect(scanStatus.value).toBe("debouncing");

    vi.advanceTimersByTime(150);
    // callback1 should NOT have fired
    expect(callback1).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    vi.runAllTimers();

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("does not schedule scan when live scan is disabled", () => {
    const { isLiveScanEnabled, scheduleScan, scanStatus } = useLiveScan();
    isLiveScanEnabled.value = false;
    const callback = vi.fn();

    scheduleScan("const x = 1;", "javascript", "test.js", callback);
    expect(scanStatus.value).toBe("idle");
    vi.runAllTimers();
    expect(callback).not.toHaveBeenCalled();
  });
});
