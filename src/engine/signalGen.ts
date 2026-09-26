import type { SimulatorParams, TelemetrySample } from './types';

const FS = 10; // Hz
const DURATION_S = 300; // 5 minutes
const N = FS * DURATION_S;

/** Deterministic PRNG (mulberry32) so the same params always produce the same trip. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashParams(p: SimulatorParams): number {
  const str = Object.values(p).join(',');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Generate a 5-minute trip at 10 Hz from simulator slider values.
 * Each slider (0-100) controls how "harsh" the corresponding behaviour is.
 */
export function generateTrip(params: SimulatorParams): TelemetrySample[] {
  const rng = mulberry32(hashParams(params));
  const samples: TelemetrySample[] = [];

  const brakingLevel = params.brakingHarshness / 100;
  const accelLevel = params.accelHarshness / 100;
  const speedSteadiness = params.speedSteadiness / 100;
  const turningLevel = params.turningSmoothness / 100;
  const steeringLevel = params.steeringNervousness / 100;

  const MAX_SPEED = 30; // m/s (~108 km/h) — realistic open-road cap
  const MAX_DECEL = -9.5; // m/s² floor — near the practical limit of real braking (~0.97 g)
  const MAX_ACCEL = 4.5; // m/s² ceiling

  // Base speed profile: a few accel / cruise / decel phases.
  // Cruise phases now carry a target speed the car eases toward, instead of
  // snapping to a fixed value — this removes the unrealistic "cliff" jumps
  // that used to appear at every phase boundary.
  const phases = [
    { start: 0, end: 30, type: 'accel' as const },
    { start: 30, end: 90, type: 'cruise' as const, target: 18 },
    { start: 90, end: 110, type: 'decel' as const },
    { start: 110, end: 140, type: 'accel' as const },
    { start: 140, end: 200, type: 'cruise' as const, target: 20 },
    { start: 200, end: 220, type: 'decel' as const },
    { start: 220, end: 260, type: 'accel' as const },
    { start: 260, end: 300, type: 'cruise' as const, target: 16 },
  ];

  // Turn events (lateral acceleration bumps) — unchanged
  const turnEvents = [
    { time: 50, duration: 8, magnitude: 0.8 + turningLevel * 3.5 },
    { time: 130, duration: 10, magnitude: 0.6 + turningLevel * 3.0 },
    { time: 210, duration: 7, magnitude: 0.9 + turningLevel * 3.2 },
    { time: 270, duration: 9, magnitude: 0.7 + turningLevel * 3.8 },
  ];

  let speed = 0; // running speed, carried continuously across the whole trip

  for (let i = 0; i < N; i++) {
    const t = i / FS;
    const phase = phases.find((p) => t >= p.start && t < p.end) ?? phases[0];

    const accelNoise = (1 - speedSteadiness) * 0.3 + 0.05;

    let aLong: number;
    if (phase.type === 'accel') {
      const baseAccel = 1.2 + accelLevel * 2.5;
      aLong = baseAccel + (rng() - 0.5) * accelNoise * 2;
    } else if (phase.type === 'decel') {
      const baseDecel = -(1.5 + brakingLevel * 5.0);
      aLong = baseDecel + (rng() - 0.5) * accelNoise * 2;
      // Occasional harsh braking spike, clamped to a realistic floor
      if (brakingLevel > 0.3 && rng() < 0.02 + brakingLevel * 0.05) {
        aLong = Math.max(MAX_DECEL, baseDecel * 1.8 - brakingLevel * 2);
      }
    } else {
      // Cruise: gently pull speed toward this phase's target instead of
      // resetting it — this is what makes phase transitions continuous.
      const k = 0.6;
      aLong = k * (phase.target - speed) + (rng() - 0.5) * accelNoise * 2;
    }

    aLong = Math.min(MAX_ACCEL, Math.max(MAX_DECEL, aLong));
    speed = Math.min(MAX_SPEED, Math.max(0, speed + aLong / FS));

    // Lateral acceleration from turns — unchanged
    let aLat = 0;
    for (const turn of turnEvents) {
      const dt = t - turn.time;
      if (dt >= 0 && dt <= turn.duration) {
        const norm = dt / turn.duration;
        const bump = Math.sin(norm * Math.PI);
        aLat = turn.magnitude * bump;
        aLat += (rng() - 0.5) * turningLevel * 1.5;
      }
    }
    aLat += (rng() - 0.5) * 0.2;

    // Yaw rate: related to lateral accel / speed, plus nervousness — unchanged
    const baseYaw = speed > 1 ? aLat / speed : 0;
    const nervousNoise = (rng() - 0.5) * steeringLevel * 0.15;
    const yawRate = baseYaw + nervousNoise;

    samples.push({
      time_s: +(t).toFixed(3),
      a_long: +aLong.toFixed(4),
      a_lat: +aLat.toFixed(4),
      yaw_rate: +yawRate.toFixed(5),
      speed: +speed.toFixed(4),
    });
  }

  return samples;
}

export { FS as SAMPLE_RATE };
