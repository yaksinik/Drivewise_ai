import type { DataSource, ScoreResult, TelemetrySample } from '@/engine/types';
import type { InstructorEvaluation } from '@/engine/instructorStudy';

export interface DriverProfile {
  id: string;
  name: string;
  learnerStage: 'Learner (L-Plates)' | 'Novice (P-Plates / < 2 yrs)' | 'Experienced Driver' | 'Professional / Fleet';
  vehicleModel: string;
  transmission: 'Automatic' | 'Manual' | 'EV / One-Pedal';
  studyCohort: 'Intervention Group (App Feedback)' | 'Control Group (Standard Training)' | 'Instructor Parallel Cohort';
  targetGoal: string;
  joinedDate: string;
}

export interface SavedTripRecord {
  id: string;
  driverId: string;
  title: string;
  timestamp: string;
  durationSeconds: number;
  sampleCount: number;
  dataSource: DataSource;
  tags: string[];
  notes?: string;
  overallScore: number;
  dataQualityScore: number;
  skills: {
    id: string;
    label: string;
    score: number;
    status: string;
  }[];
  harshBrakingCount: number;
  samples: TelemetrySample[];
  scoreResult: ScoreResult;
  instructorEvaluation?: InstructorEvaluation;
}

const PROFILE_KEY = 'drivewise_active_profile_v1';
const TRIPS_KEY = 'drivewise_saved_trips_v1';

export const DEFAULT_DRIVER_PROFILE: DriverProfile = {
  id: 'usr_new',
  name: '',
  learnerStage: 'Learner (L-Plates)',
  vehicleModel: '',
  transmission: 'Automatic',
  studyCohort: 'Intervention Group (App Feedback)',
  targetGoal: '',
  joinedDate: new Date().toISOString(),
};

// No seeded trips — the account starts empty and honest.
export const INITIAL_SEEDED_TRIPS: SavedTripRecord[] = [];

export function getStoredDriverProfile(): DriverProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_DRIVER_PROFILE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DRIVER_PROFILE;
  }
}

export function saveDriverProfile(profile: DriverProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save driver profile:', err);
  }
}

export function getStoredTrips(): SavedTripRecord[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTripToStorage(record: SavedTripRecord): SavedTripRecord[] {
  try {
    const existing = getStoredTrips();
    // Prepend new trip
    const updated = [record, ...existing.filter((t) => t.id !== record.id)];
    localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save trip to storage:', err);
    return [];
  }
}

export function deleteStoredTrip(tripId: string): SavedTripRecord[] {
  try {
    const existing = getStoredTrips();
    const updated = existing.filter((t) => t.id !== tripId);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete trip:', err);
    return [];
  }
}

export function exportAllUserData(): string {
  const data = {
    exportDate: new Date().toISOString(),
    profile: getStoredDriverProfile(),
    trips: getStoredTrips(),
  };
  return JSON.stringify(data, null, 2);
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  importedTrips: number;
  skippedTrips: number;
  importedProfile: boolean;
}

/**
 * Import a previously exported longitudinal JSON (from exportAllUserData).
 * Merges profile + trips into this browser's localStorage:
 * - profile is overwritten with the imported one
 * - trips are merged by id (imported copy wins on conflict, no duplicates)
 */
export function importAllUserData(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      error: 'This file is not valid JSON. Please choose the file downloaded from "Export Longitudinal JSON".',
      importedTrips: 0,
      skippedTrips: 0,
      importedProfile: false,
    };
  }

  const data = parsed as { profile?: unknown; trips?: unknown };

  if (!data || typeof data !== 'object' || !data.profile || !Array.isArray(data.trips)) {
    return {
      ok: false,
      error:
        'This does not look like a DriveWise export — it is missing the "profile"/"trips" fields. Please use the file from Account → "Export Longitudinal JSON".',
      importedTrips: 0,
      skippedTrips: 0,
      importedProfile: false,
    };
  }

  // Validate trip records: must have an id and raw samples to be usable.
  const validTrips = (data.trips as SavedTripRecord[]).filter(
    (t) => t && typeof t === 'object' && typeof t.id === 'string' && Array.isArray(t.samples),
  );
  if (validTrips.length === 0 && (data.trips as unknown[]).length > 0) {
    return {
      ok: false,
      error:
        'This file contains trips but none have the required sensor samples (a report/summary JSON is not enough — use the Account export).',
      importedTrips: 0,
      skippedTrips: 0,
      importedProfile: false,
    };
  }

  // Merge trips by id — imported copy wins, no duplicates.
  const existing = getStoredTrips();
  const byId = new Map<string, SavedTripRecord>();
  for (const t of existing) byId.set(t.id, t);
  let skipped = 0;
  for (const t of validTrips) {
    if (byId.has(t.id)) skipped++;
    byId.set(t.id, t);
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(merged));

    let importedProfile = false;
    const importedProfileData = data.profile as DriverProfile;
    if (typeof importedProfileData === 'object' && importedProfileData && importedProfileData.id) {
      saveDriverProfile(importedProfileData);
      importedProfile = true;
    }

    return {
      ok: true,
      importedTrips: validTrips.length,
      skippedTrips: skipped,
      importedProfile,
    };
  } catch (err) {
    console.error('Failed to import data:', err);
    return {
      ok: false,
      error: 'Could not save the imported data — browser storage may be full.',
      importedTrips: 0,
      skippedTrips: 0,
      importedProfile: false,
    };
  }
}
