export function saveNotes(
  key: string,
  content: string
): void {
  try {
    localStorage.setItem(key, content);
  } catch {
    console.error("Failed to save notes to localStorage");
  }
}

export function loadNotes(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    console.error("Failed to load notes from localStorage");
    return "";
  }
}

export function clearNotes(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.error("Failed to clear notes from localStorage");
  }
}

export function getAllNoteKeys(): Array<{ key: string; lastModified: number }> {
  const keys: Array<{ key: string; lastModified: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("notes:")) {
        keys.push({
          key: k,
          lastModified: localStorage.lastModified ?? 0
        });
      }
    }
  } catch {
    /* localStorage unavailable */
  }
  return keys;
}

export interface NoteRecord {
  key: string;
  content: string;
}

export function saveNoteRecord(record: NoteRecord): void {
  saveNotes(record.key, record.content);
}

export function loadNoteRecord(key: string): NoteRecord {
  return {
    key,
    content: loadNotes(key)
  };
}
