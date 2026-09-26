import type { SkillSpec, AssumptionProfile, SkillId } from './types';

/**
 * Default "Standard" skill definitions with good/bad thresholds.
 * Each feature maps a measured value to a 0-100 score via linear interpolation.
 */
export const DEFAULT_SKILLS: SkillSpec[] = [
  {
    id: 'braking',
    label: 'Braking',
    icon: 'Disc',
    drill: '3-Meter Whisper Stop',
    features: [
      {
        key: 'peak_decel',
        label: 'Peak deceleration',
        unit: 'm/s²',
        goodThreshold: 2.0,
        badThreshold: 6.0,
        source: 'Example value - needs literature check',
        reason: 'Gentle braking stays under ~2 m/s²; harsh braking exceeds ~6 m/s².',
      },
      {
        key: 'max_neg_jerk',
        label: 'Max negative jerk',
        unit: 'm/s³',
        goodThreshold: 1.0,
        badThreshold: 6.0,
        source: 'Example value - needs literature check',
        reason: 'Smooth deceleration changes slowly (jerk < 1 m/s³); abrupt braking produces jerk > 6 m/s³.',
      },
    ],
  },
  {
    id: 'acceleration',
    label: 'Acceleration',
    icon: 'Gauge',
    drill: 'Feather-Throttle Pull-Away',
    features: [
      {
        key: 'accel_p99',
        label: 'Acceleration (99th percentile)',
        unit: 'm/s²',
        goodThreshold: 1.0,
        badThreshold: 3.5,
        source: 'Example value - needs literature check',
        reason: 'Calm acceleration stays near 1 m/s²; aggressive acceleration exceeds 3.5 m/s².',
      },
      {
        key: 'max_pos_jerk',
        label: 'Max positive jerk',
        unit: 'm/s³',
        goodThreshold: 1.0,
        badThreshold: 6.0,
        source: 'Example value - needs literature check',
        reason: 'Smooth throttle application has jerk < 1 m/s³; sudden throttle produces jerk > 6 m/s³.',
      },
    ],
  },
  {
    id: 'speed',
    label: 'Speed Consistency',
    icon: 'Gauge',
    drill: 'Steady Cruise Challenge',
    features: [
      {
        key: 'speed_dev_std',
        label: 'Speed deviation (std dev from 10 s rolling mean)',
        unit: 'm/s',
        goodThreshold: 0.6,
        badThreshold: 2.0,
        source: 'Example value - needs literature check',
        reason: 'Consistent cruising deviates < 0.6 m/s from its local average; erratic speed deviates > 2 m/s.',
      },
    ],
  },
  {
    id: 'turning',
    label: 'Turning',
    icon: 'CornerUpRight',
    drill: 'Slow-In, Smooth-Out Corners',
    features: [
      {
        key: 'lat_jerk_turn_p90',
        label: 'Lateral jerk during turns (90th percentile)',
        unit: 'm/s³',
        goodThreshold: 0.5,
        badThreshold: 3.0,
        source: 'Example value - needs literature check',
        reason: 'Smooth turns keep lateral jerk under 0.5 m/s³; jerky cornering exceeds 3 m/s³.',
      },
    ],
  },
  {
    id: 'steering',
    label: 'Steering',
    icon: 'ShipWheel',
    drill: 'Look-Far-Ahead Lane Hold',
    features: [
      {
        key: 'steer_hp_rms',
        label: 'Steering high-pass RMS',
        unit: 'rad/s',
        goodThreshold: 0.01,
        badThreshold: 0.06,
        source: 'Example value - needs literature check',
        reason: 'Smooth steering has low high-frequency energy (< 0.01 rad/s RMS); nervous steering exceeds 0.06.',
      },
    ],
  },
];

export const ASSUMPTION_PROFILES: AssumptionProfile[] = [
  {
    id: 'beginner',
    label: 'Beginner-friendly',
    description: 'More forgiving thresholds for new drivers.',
    multipliers: {
      braking: 1.4,
      acceleration: 1.35,
      speed: 1.3,
      turning: 1.4,
      steering: 1.35,
    } as Record<SkillId, number>,
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Balanced thresholds based on typical driving behaviour.',
    multipliers: {
      braking: 1.0,
      acceleration: 1.0,
      speed: 1.0,
      turning: 1.0,
      steering: 1.0,
    } as Record<SkillId, number>,
  },
  {
    id: 'strict',
    label: 'Strict',
    description: 'Higher expectations for experienced, smooth drivers.',
    multipliers: {
      braking: 0.7,
      acceleration: 0.75,
      speed: 0.8,
      turning: 0.7,
      steering: 0.75,
    } as Record<SkillId, number>,
  },
];

export const DRILLS: Record<SkillId, string> = {
  braking: '3-Meter Whisper Stop',
  acceleration: 'Feather-Throttle Pull-Away',
  speed: 'Steady Cruise Challenge',
  turning: 'Slow-In, Smooth-Out Corners',
  steering: 'Look-Far-Ahead Lane Hold',
};
