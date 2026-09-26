import type { TelemetrySample } from './types';
import { resample, clamp } from './dsp';
import { SAMPLE_RATE } from './signalGen';

export interface CsvParseResult {
  samples: TelemetrySample[];
  error: string | null;
}

const REQUIRED_COLS = ['time_s', 'a_long', 'a_lat', 'yaw_rate', 'speed'];

/** Parse a CSV string into telemetry samples, resampled to 10 Hz. */
export function parseCsv(text: string): CsvParseResult {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { samples: [], error: 'The file appears to be empty or has no data rows.' };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

  // Check for missing columns
  const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return {
      samples: [],
      error: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Expected columns: ${REQUIRED_COLS.join(', ')}.`,
    };
  }

  const colIdx: Record<string, number> = {};
  for (const c of REQUIRED_COLS) {
    colIdx[c] = headers.indexOf(c);
  }

  const raw: TelemetrySample[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length < headers.length) continue;
    const time_s = parseFloat(parts[colIdx['time_s']]);
    const a_long = parseFloat(parts[colIdx['a_long']]);
    const a_lat = parseFloat(parts[colIdx['a_lat']]);
    const yaw_rate = parseFloat(parts[colIdx['yaw_rate']]);
    const speed = parseFloat(parts[colIdx['speed']]);
    if ([time_s, a_long, a_lat, yaw_rate, speed].some((v) => isNaN(v))) continue;
    raw.push({ time_s, a_long, a_lat, yaw_rate, speed });
  }

  if (raw.length === 0) {
    return { samples: [], error: 'No valid numeric data rows found in the file.' };
  }

  // Sort by time
  raw.sort((a, b) => a.time_s - b.time_s);

  // Resample to 10 Hz
  const resampled = resample(raw, SAMPLE_RATE);

  return { samples: resampled, error: null };
}

/** Generate a sample CSV for download. */
export function generateSampleCsv(): string {
  const lines = ['time_s,a_long,a_lat,yaw_rate,speed'];
  const dt = 1 / SAMPLE_RATE;
  for (let i = 0; i < 300 * SAMPLE_RATE; i++) {
    const t = i * dt;
    const aLong = 1.5 * Math.sin(t * 0.1) + (Math.random() - 0.5) * 0.3;
    const aLat = 0.8 * Math.sin(t * 0.05) + (Math.random() - 0.5) * 0.2;
    const yaw = 0.02 * Math.sin(t * 0.05) + (Math.random() - 0.5) * 0.01;
    const speed = 15 + 5 * Math.sin(t * 0.02);
    lines.push(`${t.toFixed(2)},${aLong.toFixed(3)},${aLat.toFixed(3)},${yaw.toFixed(4)},${speed.toFixed(2)}`);
  }
  return lines.join('\n');
}

export { SAMPLE_RATE, clamp };
