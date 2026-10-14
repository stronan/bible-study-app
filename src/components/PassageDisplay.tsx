import React from "react";
import type { Passage, Verse, WordsOfJesusSegment } from "../api";
import type { ParsedReference, PassageContext } from "../utils";
import { isTargetVerse, formatReference, formatContextReference } from "../utils";

interface PassageDisplayProps {
  passage: Passage | null;
  reference: ParsedReference;
  context: PassageContext;
  error: string | null;
  loading: boolean;
}

export const PassageDisplay: React.FC<PassageDisplayProps> = ({
  passage,
  reference,
  context,
  error,
  loading,
}) => {
  if (error) {
    return (
      <div className="passage-display error-state">
        <h2>{reference.bookName || reference.original}</h2>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (loading || !passage) {
    return (
      <div className="passage-display loading-state">
        <h2>{formatReference(reference)}</h2>
        <div className="passage-loading">
          <span className="spinner" aria-label="loading"></span>
          <span>Loading passage...</span>
        </div>
      </div>
    );
  }

  const referenceLabel = formatContextReference(
    reference,
    context.contextStart,
    context.contextEnd
  );

  const showContext = context.contextStart !== reference.startVerse || context.contextEnd !== reference.endVerse;

  return (
    <div className="passage-display">
      <div className="passage-header">
        <h2>{referenceLabel}</h2>
        {showContext && (
          <span className="context-badge">
            Showing {context.contextStart}-{context.contextEnd} with {formatReference(reference)} highlighted
          </span>
        )}
      </div>
      <div className={`passage-text ${showContext ? "with-context" : ""}`}>
        <p className="verses">
          {passage.data.map((verse) => renderVerse(verse, reference))}
        </p>
      </div>
    </div>
  );
};

function renderVerse(
  verse: Verse,
  reference: ParsedReference
): React.ReactNode {
  const isTarget = isTargetVerse(verse.verse_number, reference.startVerse, reference.endVerse);

  const textContent = verse.segments && verse.segments.length > 0
    ? renderSegments(verse.segments)
    : verse.text;

  const verseClass = isTarget ? "verse-target" : "verse-context";

  return (
    <React.Fragment key={verse.id}>
      <sup className={`verse-number ${verseClass}`}>
        {verse.verse_number}
      </sup>
      <span className={`verse-text ${verseClass}`}>
        {textContent}{" "}
      </span>
    </React.Fragment>
  );
}

function renderSegments(segments: WordsOfJesusSegment[]): React.ReactNode {
  return segments.map((seg, i) => (
    <React.Fragment key={i}>
      {seg.is_jesus ? (
        <span className="words-of-jesus" title="Words of Jesus">{seg.text}</span>
      ) : (
        <span>{seg.text}</span>
      )}
      {" "}
    </React.Fragment>
  ));
}
