import React from "react";

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  value,
  onChange,
  onSubmit,
  loading,
  onKeyDown,
}) => {
  return (
    <div className="input-section">
      <label htmlFor="passage-input">Enter Bible references (one per line or comma-separated):</label>
      <textarea
        id="passage-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="John 3:16&#10;Romans 8:28-30&#10;Genesis 1:1-5"
        disabled={loading}
        rows={4}
        className="passage-input"
      />
      <button
        className="load-button"
        onClick={onSubmit}
        disabled={loading || value.trim().length === 0}
      >
        {loading ? "Loading..." : "Load Passages"}
      </button>
      <p className="hint">
        Supports formats like: "John 3:16", "Romans 8:28-30", "Genesis 1:1-5".
        Press Ctrl+Enter to submit.
      </p>
    </div>
  );
};
