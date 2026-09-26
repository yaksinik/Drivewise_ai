// Low-pass and high-pass Butterworth-style filters plus numerical helpers.

/**
 * 1st-order low-pass filter (simplified Butterworth).
 * fc = cutoff Hz, fs = sample rate Hz.
 */
export function lowPass(signal: number[], fc: number, fs: number): number[] {
  const rc = 1 / (2 * Math.PI * fc);
  const dt = 1 / fs;
  const alpha = dt / (rc + dt);
  const out = new Array<number>(signal.length);
  let prev = signal[0] ?? 0;
  for (let i = 0; i < signal.length; i++) {
    prev = prev + alpha * (signal[i] - prev);
    out[i] = prev;
  }
  return out;
}

/** High-pass = original − low-pass. */
export function highPass(signal: number[], fc: number, fs: number): number[] {
  const lp = lowPass(signal, fc, fs);
  return signal.map((v, i) => v - (lp[i] ?? 0));
}

/** Numerical derivative (jerk = d(a)/dt). */
export function derivative(signal: number[], fs: number): number[] {
  const dt = 1 / fs;
  const out = new Array<number>(signal.length).fill(0);
  for (let i = 1; i < signal.length; i++) {
    out[i] = (signal[i] - signal[i - 1]) / dt;
  }
  return out;
}

/**
 * Centered rolling mean over a window of `windowSec` seconds.
 * Unlike a trailing average, this does not lag behind a rising or falling
 * signal — which matters when measuring deviation from a "local trend."
 * A trailing average is always behind during a ramp, which makes normal
 * acceleration or braking look like noisy inconsistency even when it isn't.
 */
export function centeredRollingMean(signal: number[], fs: number, windowSec: number): number[] {
  const halfWin = Math.max(1, Math.round((windowSec * fs) / 2));
  const n = signal.length;
  const out = new Array<number>(n).fill(0);
  const prefix = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + signal[i];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - halfWin);
    const hi = Math.min(n, i + halfWin + 1);
    out[i] = (prefix[hi] - prefix[lo]) / (hi - lo);
  }
  return out;
}

/** Rolling mean over a window of `windowSec` seconds. */
export function rollingMean(signal: number[], fs: number, windowSec: number): number[] {
  const winSize = Math.max(1, Math.round(windowSec * fs));
  const out = new Array<number>(signal.length).fill(0);
  for (let i = 0; i < signal.length; i++) {
    const start = Math.max(0, i - winSize + 1);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += signal[j];
    out[i] = sum / (i - start + 1);
  }
  return out;
}

/** Standard deviation. */
export function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** Percentile (linear interpolation). */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** RMS (root mean square). */
export function rms(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.sqrt(arr.reduce((a, b) => a + b * b, 0) / arr.length);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Linear resample to target frequency (nearest-neighbour, simple). */
export function resample(
  samples: { time_s: number; a_long: number; a_lat: number; yaw_rate: number; speed: number }[],
  targetHz: number,
): { time_s: number; a_long: number; a_lat: number; yaw_rate: number; speed: number }[] {
  if (samples.length === 0) return [];
  const t0 = samples[0].time_s;
  const tEnd = samples[samples.length - 1].time_s;
  const dt = 1 / targetHz;
  const n = Math.max(1, Math.round((tEnd - t0) / dt) + 1);
  const out: { time_s: number; a_long: number; a_lat: number; yaw_rate: number; speed: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt;
    // find nearest sample
    let nearest = samples[0];
    let bestDist = Infinity;
    for (const s of samples) {
      const d = Math.abs(s.time_s - t);
      if (d < bestDist) {
        bestDist = d;
        nearest = s;
      }
    }
    out.push({ ...nearest, time_s: t });
  }
  return out;
}
