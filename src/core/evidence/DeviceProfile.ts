import type { DeviceProfile } from "./types";

/**
 * Captures what the browser knows about the device it runs on.
 *
 * Deliberately verbose compared to lab-01's `shortDeviceInfo()`, which is
 * trimmed to fit the debug overlay. A report is read later, out of
 * context, by someone deciding whether a measurement generalises — "iPhone
 * or Android? which browser? how many cores?" all matter then and none of
 * them fit on screen.
 */
export function captureDeviceProfile(): DeviceProfile {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
  };

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform ?? "unknown",
    language: navigator.language ?? "unknown",
    timezone: safeTimezone(),
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio ?? 1,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemoryGb: nav.deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    probablyMobile: isProbablyMobile(),
  };
}

/**
 * A hint, not a verdict. Reported as `probablyMobile` so a reader never
 * mistakes it for a measured fact — a desktop with a touchscreen and a
 * narrow window will trip it, and that is acceptable for a hint.
 */
function isProbablyMobile(): boolean {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 1;
  const uaHint = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return uaHint || (coarse && touch);
}

function safeTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown";
  } catch {
    return "unknown";
  }
}
