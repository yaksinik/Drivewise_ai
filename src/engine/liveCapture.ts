import type { TelemetrySample } from './types';
import { resample } from './dsp';

export interface RawMotionSample {
  time_s: number;
  ax: number; // accelerationIncludingGravity.x, phone frame, m/s^2
  ay: number; // accelerationIncludingGravity.y, phone frame, m/s^2
  az: number; // accelerationIncludingGravity.z, phone frame, m/s^2
  rz: number; // rotationRate.gamma, deg/s
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
}

/**
 * Request DeviceMotion access. On iOS 13+ Safari this triggers an explicit
 * permission popup and MUST be called directly inside a user gesture (e.g.
 * a button's onClick) or it will silently fail. Requires HTTPS (or
 * localhost) — it will not work in a sandboxed preview iframe.
 */
export async function requestMotionPermission(): Promise<PermissionResult> {
  const DME = (window as any).DeviceMotionEvent;
  if (!DME) {
    return {
      granted: false,
      reason: 'This browser does not report motion sensors (DeviceMotionEvent unavailable). Try Chrome or Safari on a phone, over HTTPS.',
    };
  }
  if (typeof DME.requestPermission === 'function') {
    try {
      const result = await DME.requestPermission();
      if (result !== 'granted') {
        return { granted: false, reason: 'Motion sensor permission was not granted. Check your browser or site settings and try again.' };
      }
      return { granted: true };
    } catch {
      return { granted: false, reason: 'Motion sensor permission request failed — this usually means the page is not served over HTTPS.' };
    }
  }
  // Most non-iOS browsers (e.g. Android Chrome) have no explicit prompt.
  return { granted: true };
}

/**
 * Records raw device motion samples between start() and stop(). The first
 * couple of seconds are used later for a gravity calibration, so the phone
 * must be held still at the very start of recording.
 */
export class LiveRecorder {
  private raw: RawMotionSample[] = [];
  private startTime: number | null = null;

  private handler = (e: DeviceMotionEvent) => {
    if (this.startTime === null) return;
    const acc = e.accelerationIncludingGravity;
    const rot = e.rotationRate;
    if (!acc || acc.x === null || acc.x === undefined) return;
    this.raw.push({
      time_s: (performance.now() - this.startTime) / 1000,
      ax: acc.x ?? 0,
      ay: acc.y ?? 0,
      az: acc.z ?? 0,
      rz: rot?.gamma ?? 0,
    });
  };

  start(): void {
    this.raw = [];
    this.startTime = performance.now();
    window.addEventListener('devicemotion', this.handler);
  }

  /** Stops listening and returns everything captured so far. */
  stop(): RawMotionSample[] {
    window.removeEventListener('devicemotion', this.handler);
    this.startTime = null;
    return this.raw;
  }

  sampleCount(): number {
    return this.raw.length;
  }
}

/**
 * Convert raw phone-frame samples into the app's TelemetrySample format.
 *
 * Simplifying assumptions in this Stage-1 prototype (surfaced to the user,
 * not hidden):
 * - Gravity is estimated by averaging the first `calibSec` seconds, so the
 *   phone must be held still at the start of recording.
 * - The phone is assumed mounted flat, screen up, with the top of the phone
 *   pointing toward the front of the car (phone Y axis ≈ forward,
 *   X axis ≈ lateral). A production version would detect the forward axis
 *   from the first strong acceleration instead of assuming a fixed mount.
 * - There is no GPS in this prototype, so speed is left at 0 for every
 *   sample. The app's own Data Quality check will correctly flag "speed"
 *   as a flat/missing signal for live-recorded trips — this is expected,
 *   not a bug, and is explained in the Live Trip panel.
 */
export function processLiveSamples(raw: RawMotionSample[], calibSec = 2): TelemetrySample[] {
  if (raw.length < 10) return [];

  const calibEnd = raw.findIndex((s) => s.time_s > calibSec);
  const calibSamples = raw.slice(0, calibEnd > 0 ? calibEnd : Math.min(20, raw.length));
  const gravity = {
    x: calibSamples.reduce((a, s) => a + s.ax, 0) / calibSamples.length,
    y: calibSamples.reduce((a, s) => a + s.ay, 0) / calibSamples.length,
  };

  const DEG2RAD = Math.PI / 180;

  const irregular: TelemetrySample[] = raw.map((s) => ({
    time_s: s.time_s,
    a_long: s.ay - gravity.y,
    a_lat: s.ax - gravity.x,
    yaw_rate: s.rz * DEG2RAD,
    speed: 0,
  }));

  // devicemotion fires at whatever rate the OS provides (often 30-60+ Hz,
  // and not perfectly even) — resample onto the engine's fixed 10 Hz grid.
  return resample(irregular, 10);
}