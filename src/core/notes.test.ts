import { describe, expect, it } from "vitest";
import {
  addHabitNote,
  deleteHabitNote,
  deleteHabitNotes,
  normalizeHabitNotes,
  updateHabitNote,
} from "./notes";

describe("habit quick notes", () => {
  it("normalizes stored notes and drops empty entries", () => {
    const notes = normalizeHabitNotes({
      h1: [
        { id: "a", text: "  ilk not  ", createdAt: 10, updatedAt: 12 },
        { id: "b", text: "   ", createdAt: 20 },
        { text: "kimliksiz", createdAt: 30 },
      ],
      h2: "bozuk",
    });

    expect(notes.h1).toHaveLength(2);
    expect(notes.h1[0]).toMatchObject({ id: "a", text: "ilk not", createdAt: 10, updatedAt: 12 });
    expect(notes.h1[1].text).toBe("kimliksiz");
    expect(notes.h1[1].id).toMatch(/^n-/);
    expect(notes.h2).toBeUndefined();
  });

  it("adds new notes to the top", () => {
    const first = addHabitNote({}, "h1", "ilk", 100);
    const second = addHabitNote(first, "h1", "ikinci", 200);

    expect(second.h1.map((note) => note.text)).toEqual(["ikinci", "ilk"]);
    expect(second.h1[0].createdAt).toBe(200);
  });

  it("edits a note in place and updates its timestamp", () => {
    const source = addHabitNote({}, "h1", "eski", 100);
    const noteId = source.h1[0].id;
    const next = updateHabitNote(source, "h1", noteId, "  yeni  ", 300);

    expect(next.h1[0]).toMatchObject({ id: noteId, text: "yeni", createdAt: 100, updatedAt: 300 });
    expect(updateHabitNote(source, "h1", noteId, "   ", 400)).toBe(source);
  });

  it("deletes one note or all notes for a habit", () => {
    const first = addHabitNote({}, "h1", "ilk", 100);
    const second = addHabitNote(first, "h1", "ikinci", 200);
    const removed = deleteHabitNote(second, "h1", second.h1[1].id);

    expect(removed.h1).toHaveLength(1);
    expect(deleteHabitNote(removed, "h1", removed.h1[0].id).h1).toBeUndefined();
    expect(deleteHabitNotes(second, "h1").h1).toBeUndefined();
  });
});
