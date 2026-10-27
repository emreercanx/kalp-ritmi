export interface HabitNote {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type HabitNotes = Record<string, HabitNote[]>;

export function createHabitNoteId(): string {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function noteText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function noteTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function normalizeHabitNotes(raw: unknown): HabitNotes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: HabitNotes = {};
  const fallbackNow = Date.now();

  for (const [habitId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!habitId.trim() || !Array.isArray(value)) continue;

    const notes: HabitNote[] = [];
    const seen = new Set<string>();

    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const text = noteText(record.text);
      if (!text) continue;

      let id =
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : createHabitNoteId();
      if (seen.has(id)) id = createHabitNoteId();
      seen.add(id);

      const createdAt = noteTime(record.createdAt) ?? fallbackNow;
      notes.push({
        id,
        text,
        createdAt,
        updatedAt: noteTime(record.updatedAt) ?? createdAt,
      });
    }

    if (notes.length > 0) result[habitId] = notes;
  }

  return result;
}

export function addHabitNote(
  notes: HabitNotes,
  habitId: string,
  text: string,
  now = Date.now(),
): HabitNotes {
  const value = text.trim();
  if (!value) return notes;
  const note: HabitNote = {
    id: createHabitNoteId(),
    text: value,
    createdAt: now,
    updatedAt: now,
  };
  return { ...notes, [habitId]: [note, ...(notes[habitId] ?? [])] };
}

export function updateHabitNote(
  notes: HabitNotes,
  habitId: string,
  noteId: string,
  text: string,
  now = Date.now(),
): HabitNotes {
  const value = text.trim();
  const list = notes[habitId];
  if (!value || !list) return notes;

  const next = list.map((note) =>
    note.id === noteId ? { ...note, text: value, updatedAt: now } : note,
  );
  return { ...notes, [habitId]: next };
}

export function deleteHabitNote(
  notes: HabitNotes,
  habitId: string,
  noteId: string,
): HabitNotes {
  const list = notes[habitId];
  if (!list) return notes;

  const next = list.filter((note) => note.id !== noteId);
  const copy = { ...notes };
  if (next.length > 0) copy[habitId] = next;
  else delete copy[habitId];
  return copy;
}

export function deleteHabitNotes(notes: HabitNotes, habitId: string): HabitNotes {
  if (!notes[habitId]) return notes;
  const copy = { ...notes };
  delete copy[habitId];
  return copy;
}
