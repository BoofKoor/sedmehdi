/**
 * The demo's only "write": a record's status changed in its dialog. Kept for this tab only (a
 * reload, or Reset in the Demo menu, puts every record back), because there is no server to save
 * to and the brief is that nothing leaves the page.
 */
import { useSyncExternalStore } from "react";

let edits: Record<string, string> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const editKey = (profile: string, entity: string, row: string) => `${profile}|${entity}|${row}`;

export function setEdit(key: string, status: string): void {
  edits = { ...edits, [key]: status };
  emit();
}

export function clearEdits(): void {
  edits = {};
  emit();
}

export function useEdits(): Record<string, string> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => edits,
    () => edits,
  );
}
