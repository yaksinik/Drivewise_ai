import type { TelemetrySample } from './types';
import { resample } from './dsp';

export interface RawMotionSample {
  time_s: number;
  ax: number; // accelerationIncludingGravity.x, phone frame, m/s^2
  ay: number; // accelerationIncludingGravity.y, phone frame, m/s^2
  az: number; // accelerationIncludingGravity.z, phone frame, m/s^2
  rz: number; // rotationRate.gamma, deg/s
}

export interface RawGpsSample {
  time_s: number;
  latitude: number;
  longitude: number;
  speed_ms: number; // m/s
  accuracy_m: number;
  heading_deg: number | null;
  altitude_m: number | null;
}

export interface LiveTelemetrySnapshot {
  time_s: number;
  speed_kmh: number;
  speed_mph: number;
  a_long: number; // m/s²
  a_lat: number;  // m/s²
  g_long: number; // G units (approx / 9.81)
  g_lat: number;  // G units (approx / 9.81)
  gpsAccuracy_m: number | null;
  gpsFix: boolean;
  heading: number | null; // degrees from north
  sampleCount: number;
  // Live GPS position for follow-map
  latitude: number | null;
  longitude: number | null;
}

export interface PermissionResult {
  granted: boolean;
  motionGranted: boolean;
  gpsGranted: boolean;
  reason?: string;
}

/** Haversine formula to compute distance in meters between two lat/lon points */
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Request DeviceMotion and Geolocation access.
 * DeviceMotion requires an explicit user gesture on iOS 13+ Safari over HTTPS/localhost.
 */
export async function requestMotionAndGpsPermission(): Promise<PermissionResult> {
  let motionGranted = false;
  let gpsGranted = false;
  let reason: string | undefined;

  // 1. Motion Sensor Check
  const DME = (window as any).DeviceMotionEvent;
  if (!DME) {
    reason = 'This browser does not support motion sensors (DeviceMotionEvent unavailable). Use Chrome or Safari on a mobile device.';
  } else if (typeof DME.requestPermission === 'function') {
    try {
      const result = await DME.requestPermission();
      motionGranted = result === 'granted';
      if (!motionGranted) {
        reason = 'Motion sensor permission was denied. Check your browser site settings.';
      }
    } catch {
      reason = 'Motion permission failed. Ensure the page is served over HTTPS or localhost.';
    }
  } else {
    // Non-iOS mobile browsers usually grant devicemotion without a popup
    motionGranted = true;
  }

  // 2. Geolocation Check
  if ('geolocation' in navigator) {
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            gpsGranted = true;
            resolve();
          },
          (err) => {
            console.warn('Geolocation initial prompt notice:', err.message);
            // Even if GPS fails or is denied, we can still proceed with motion sensors
            gpsGranted = false;
            resolve();
          },
          { enableHighAccuracy: true, timeout: 4000 }
        );
      });
    } catch {
      gpsGranted = false;
    }
  }

  return {
    granted: motionGranted, // primary requirement is motion; GPS enhances speed
    motionGranted,
    gpsGranted,
    reason: motionGranted ? undefined : reason,
  };
}

/** For backward compatibility */
export async function requestMotionPermission(): Promise<PermissionResult> {
  return requestMotionAndGpsPermission();
}

/**
 * Records high-frequency motion data (DeviceMotion) and real-time GPS fixes.
 * Dispatches snapshots to an optional listener for Live In-Car HUD display.
 */
export class LiveRecorder {
  private rawMotion: RawMotionSample[] = [];
  private rawGps: RawGpsSample[] = [];
  private startTime: number | null = null;
  private gpsWatchId: number | null = null;
  private lastGpsPoint: { lat: number; lon: number; time_s: number } | null = null;
  private gravityEst = { x: 0, y: 0 };
  private onSnapshotCallback?: (snapshot: LiveTelemetrySnapshot) => void;

  constructor(onSnapshot?: (snapshot: LiveTelemetrySnapshot) => void) {
    this.onSnapshotCallback = onSnapshot;
  }

  private handleMotion = (e: DeviceMotionEvent) => {
    if (this.startTime === null) return;
    const acc = e.accelerationIncludingGravity;
    const rot = e.rotationRate;
    if (!acc || acc.x === null || acc.x === undefined) return;

    const time_s = (performance.now() - this.startTime) / 1000;
    const ax = acc.x ?? 0;
    const ay = acc.y ?? 0;
    const az = acc.z ?? 0;
    const rz = rot?.gamma ?? 0;

    this.rawMotion.push({ time_s, ax, ay, az, rz });

    // Update calibration estimate during first 2 seconds
    if (time_s < 2) {
      const count = this.rawMotion.length;
      this.gravityEst.x = (this.gravityEst.x * (count - 1) + ax) / count;
      this.gravityEst.y = (this.gravityEst.y * (count - 1) + ay) / count;
    }

    // Emit live HUD snapshot every ~100ms
    if (this.onSnapshotCallback && this.rawMotion.length % 3 === 0) {
      const latestGps = this.rawGps[this.rawGps.length - 1];
      const speed_ms = latestGps ? latestGps.speed_ms : 0;
      const a_long = ay - this.gravityEst.y;
      const a_lat = ax - this.gravityEst.x;

      this.onSnapshotCallback({
        time_s: +time_s.toFixed(1),
        speed_kmh: +(speed_ms * 3.6).toFixed(1),
        speed_mph: +(speed_ms * 2.23694).toFixed(1),
        a_long: +a_long.toFixed(2),
        a_lat: +a_lat.toFixed(2),
        g_long: +(a_long / 9.81).toFixed(2),
        g_lat: +(a_lat / 9.81).toFixed(2),
        gpsAccuracy_m: latestGps ? latestGps.accuracy_m : null,
        gpsFix: Boolean(latestGps && latestGps.accuracy_m < 50),
        heading: latestGps ? latestGps.heading_deg : null,
        sampleCount: this.rawMotion.length,
        latitude: latestGps ? latestGps.latitude : null,
        longitude: latestGps ? latestGps.longitude : null,
      });
    }
  };

  private handleGps = (pos: GeolocationPosition) => {
    if (this.startTime === null) return;
    const time_s = (performance.now() - this.startTime) / 1000;
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;
    const heading = pos.coords.heading;
    const altitude = pos.coords.altitude;

    let speed_ms = 0;
    if (pos.coords.speed !== null && !isNaN(pos.coords.speed) && pos.coords.speed >= 0) {
      speed_ms = pos.coords.speed;
    } else if (this.lastGpsPoint) {
      // Calculate speed from Haversine displacement
      const dt = time_s - this.lastGpsPoint.time_s;
      if (dt > 0.4) {
        const distMeters = haversineDistanceMeters(this.lastGpsPoint.lat, this.lastGpsPoint.lon, lat, lon);
        speed_ms = Math.min(60, distMeters / dt); // cap at 216 km/h for noise rejection
      }
    }

    this.lastGpsPoint = { lat, lon, time_s };

    this.rawGps.push({
      time_s,
      latitude: lat,
      longitude: lon,
      speed_ms,
      accuracy_m: accuracy,
      heading_deg: heading,
      altitude_m: altitude,
    });
  };

  start(): void {
    this.rawMotion = [];
    this.rawGps = [];
    this.lastGpsPoint = null;
    this.gravityEst = { x: 0, y: 0 };
    this.startTime = performance.now();

    window.addEventListener('devicemotion', this.handleMotion);

    if ('geolocation' in navigator) {
      this.gpsWatchId = navigator.geolocation.watchPosition(
        this.handleGps,
        (err) => console.warn('GPS continuous watch notice:', err.message),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        }
      );
    }
  }

  stop(): { motion: RawMotionSample[]; gps: RawGpsSample[] } {
    window.removeEventListener('devicemotion', this.handleMotion);
    if (this.gpsWatchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    this.startTime = null;
    return {
      motion: this.rawMotion,
      gps: this.rawGps,
    };
  }

  sampleCount(): number {
    return this.rawMotion.length;
  }
}

/**
 * Fuse raw phone-frame motion and GPS data into standardized TelemetrySample format.
 * - Calibrates static gravity offset from the initial calibSec seconds
 * - Interpolates GPS speed onto the exact 10 Hz time grid
 * - Resamples to a clean 10 Hz telemetry array ready for scoring
 */
export function processLiveSamples(
  data: { motion: RawMotionSample[]; gps: RawGpsSample[] } | RawMotionSample[],
  calibSec = 2
): TelemetrySample[] {
  const motion: RawMotionSample[] = Array.isArray(data) ? data : data.motion;
  const gps: RawGpsSample[] = Array.isArray(data) ? [] : data.gps;

  if (motion.length < 10) return [];

  // 1. Gravity calibration: average initial stationary seconds
  const calibEnd = motion.findIndex((s) => s.time_s > calibSec);
  const calibSamples = motion.slice(0, calibEnd > 0 ? calibEnd : Math.min(20, motion.length));
  const gravity = {
    x: calibSamples.reduce((a, s) => a + s.ax, 0) / calibSamples.length,
    y: calibSamples.reduce((a, s) => a + s.ay, 0) / calibSamples.length,
  };

  const DEG2RAD = Math.PI / 180;

  // 2. Helper to interpolate GPS speed at a given motion sample timestamp
  function getSpeedAtTime(t: number): number {
    if (gps.length === 0) return 0;
    if (gps.length === 1) return gps[0].speed_ms;

    if (t <= gps[0].time_s) return gps[0].speed_ms;
    if (t >= gps[gps.length - 1].time_s) return gps[gps.length - 1].speed_ms;

    // Binary / linear search for enclosing GPS fixes
    for (let i = 0; i < gps.length - 1; i++) {
      if (t >= gps[i].time_s && t <= gps[i + 1].time_s) {
        const ratio = (t - gps[i].time_s) / (gps[i + 1].time_s - gps[i].time_s || 1);
        return +(gps[i].speed_ms + ratio * (gps[i + 1].speed_ms - gps[i].speed_ms)).toFixed(2);
      }
    }
    return gps[gps.length - 1].speed_ms;
  }

  // 3. Transform to vehicle coordinate frame
  const irregular: TelemetrySample[] = motion.map((s) => ({
    time_s: s.time_s,
    a_long: +(s.ay - gravity.y).toFixed(3),
    a_lat: +(s.ax - gravity.x).toFixed(3),
    yaw_rate: +(s.rz * DEG2RAD).toFixed(4),
    speed: getSpeedAtTime(s.time_s),
  }));

  // 4. Resample onto uniform 10 Hz grid
  return resample(irregular, 10);
}