import React, { useState, useEffect, useRef } from "react";
import type { ParsedReference } from "../utils";
import { saveNotes, loadNotes, clearNotes } from "../notes";

interface NotesPanelProps {
  passageKey: string;
  reference: ParsedReference | null;
  version: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  passageKey,
  reference,
  version,
}) => {
  const [notes, setNotes] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (passageKey) {
      const saved = loadNotes(passageKey);
      setNotes(saved);
      if (editorRef.current) {
        editorRef.current.innerHTML = saved;
      }
    }
  }, [passageKey]);

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      const newContent = editorRef.current.innerHTML;
      setNotes(newContent);
    }
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML ?? "";
    setNotes(content);
    saveNotes(passageKey, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setNotes("");
    clearNotes(passageKey);
    setSaved(false);
  };

  const handleInput = () => {
    const content = editorRef.current?.innerHTML ?? "";
    setNotes(content);
  };

  const referenceLabel = reference ? `${reference.bookName} ${reference.chapter}:${reference.startVerse}-${reference.endVerse}` : "No passage selected";

  const formatInline = (_command: string, tag: string) => {
    const marker = notes.includes(`<${tag}>`) ? "Remove" : "Add";
    return `${marker} ${tag.toUpperCase()}`;
  };

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h3>Notes for {referenceLabel}</h3>
        {reference && reference.book && (
          <span className="notes-version">Version: {version}</span>
        )}
      </div>
      <div className="notes-toolbar">
        <button
          type="button"
          className="format-button"
          onClick={() => execCommand("bold")}
          aria-label={formatInline("bold", "b")}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="format-button"
          onClick={() => execCommand("italic")}
          aria-label={formatInline("italic", "i")}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="format-button"
          onClick={() => execCommand("underline")}
          aria-label={formatInline("underline", "u")}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className="format-button"
          onClick={() => execCommand("insertUnorderedList")}
          aria-label="Bullet list"
          title="Bullet list"
        >
          ••
        </button>
        <button
          type="button"
          className="format-button"
          onClick={() => execCommand("removeFormat")}
          aria-label="Remove formatting"
          title="Clear formatting"
        >
          ≡
        </button>
        <div className="notes-actions">
          <button
            type="button"
            className="save-button"
            onClick={handleSave}
            disabled={!passageKey}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            disabled={!passageKey}
          >
            Clear
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        className="notes-editor"
        contentEditable={!!passageKey}
        onInput={handleInput}
        data-placeholder="Write your notes here..."
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "b") {
            e.preventDefault();
            execCommand("bold");
          } else if (e.ctrlKey && e.key === "i") {
            e.preventDefault();
            execCommand("italic");
          } else if (e.ctrlKey && e.key === "u") {
            e.preventDefault();
            execCommand("underline");
          }
        }}
      />
    </div>
  );
};
