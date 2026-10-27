import type { Habit } from "./types";

export function wouldCreateStackCycle(
  habits: Habit[],
  habitId: string,
  cueId: string | undefined,
): boolean {
  if (!cueId) return false;
  if (cueId === habitId) return true;

  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  const seen = new Set<string>();
  let cursor = cueId;

  while (cursor && !seen.has(cursor)) {
    if (cursor === habitId) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.stackAfter ?? "";
  }
  return false;
}

/** Stable topological order: cue habits come before the habits stacked on them. */
export function sortByStack(habits: Habit[]): Habit[] {
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  const result: Habit[] = [];
  const added = new Set<string>();
  const visiting = new Set<string>();

  const visit = (habit: Habit): void => {
    if (added.has(habit.id)) return;
    if (visiting.has(habit.id)) return;

    visiting.add(habit.id);
    const parent = habit.stackAfter ? byId.get(habit.stackAfter) : undefined;
    if (parent && parent.id !== habit.id) visit(parent);
    visiting.delete(habit.id);
    added.add(habit.id);
    result.push(habit);
  };

  for (const habit of habits) visit(habit);
  return result;
}

export function stackParentName(habits: Habit[], habit: Habit): string | undefined {
  if (!habit.stackAfter) return undefined;
  return habits.find((candidate) => candidate.id === habit.stackAfter)?.name;
}
