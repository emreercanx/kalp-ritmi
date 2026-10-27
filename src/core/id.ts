/** Short, collision-resistant id. Names can change; ids and logs stay stable. */
export function createHabitId(): string {
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
