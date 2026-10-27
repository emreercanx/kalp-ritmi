export type HabitKind = "check" | "numeric" | "quit";
export type HabitCadence = "daily" | "weekly" | "monthly";
export type HabitDayPart = "anytime" | "morning" | "afternoon" | "evening";

/** Old definitions without a cadence are daily habits. */
export function habitCadence(habit: { cadence?: HabitCadence }): HabitCadence {
  return habit.cadence === "weekly" || habit.cadence === "monthly"
    ? habit.cadence
    : "daily";
}

/** Everything that is stored in Ritim/habits.json. Logs live in monthly
 *  NDJSON files so two devices can append without rewriting the whole history. */
export interface HabitDefinition {
  id: string;
  name: string;
  emoji: string;
  kind: HabitKind;
  /** Tracking period. Existing definitions without this field are daily. */
  cadence?: HabitCadence;
  unit?: string;
  target?: number;
  /** Optional weekly goal: days per week for check habits, total amount for numeric ones. */
  weeklyGoal?: number;
  /** Optional weekdays (0 = Sunday). Missing means every day. */
  scheduleDays?: number[];
  /** Daily habits can repeat every N days (2–365) from createdAt. */
  intervalDays?: number;
  /** Numeric habits: a lower value that still counts as done for streaks and scores. */
  minimum?: number;
  /** Numeric habits: one-tap value shown below the day cells. */
  quickValue?: number;
  /** Inclusive pause range. Paused days are not expected and do not break streaks. */
  pausedFrom?: string;
  pausedUntil?: string;
  /** Optional cue habit: this habit is suggested after the other one. */
  stackAfter?: string;
  /** Time-of-day grouping on the daily board. */
  dayPart?: HabitDayPart;
  color: string;
  createdAt?: string;
  /** Vault-relative Markdown note linked to this habit. */
  docPath?: string;
  /** Hidden from the board while its history stays intact. */
  archived?: boolean;
}

/** A habit in memory: its definition plus the merged day log. */
export interface Habit extends HabitDefinition {
  log: Record<string, number>;
  /** Explicitly skipped days, keyed by local date, with an optional reason. */
  skips?: Record<string, string>;
}

/** Fields the habit editor can change. Identity and creation date stay stable. */
export type HabitDraft = Pick<HabitDefinition, "name" | "emoji" | "kind" | "color"> & {
  cadence?: HabitCadence;
  unit?: string;
  target?: number;
  weeklyGoal?: number;
  scheduleDays?: number[];
  intervalDays?: number;
  minimum?: number;
  quickValue?: number;
  pausedFrom?: string;
  pausedUntil?: string;
  stackAfter?: string;
  dayPart?: HabitDayPart;
  docPath?: string;
};

export type HabitChanges = Partial<HabitDraft>;
