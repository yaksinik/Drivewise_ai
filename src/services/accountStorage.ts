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
