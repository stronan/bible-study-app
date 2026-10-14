import React from "react";

interface StatusBarProps {
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  rateLimitInfo: { remaining: number; remainingMonth: number; limit: number } | null;
  passageCount: number;
  currentIndex: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  loading,
  loadingMessage,
  error,
  rateLimitInfo,
  passageCount,
  currentIndex,
}) => {
  return (
    <div className="status-bar">
      {loading && (
        <div className="status-item loading">
          <span className="spinner" aria-label="loading"></span>
          {loadingMessage}
        </div>
      )}
      {!loading && error && (
        <div className="status-item error">
          ⚠ {error}
        </div>
      )}
      {!loading && !error && passageCount > 0 && (
        <div className="status-item info">
          {currentIndex + 1} of {passageCount} passages loaded
        </div>
      )}
      {rateLimitInfo && (
        <div className="status-item rate-limit">
          API quota: {rateLimitInfo.remaining}/{rateLimitInfo.limit} this minute · {rateLimitInfo.remainingMonth} this month
        </div>
      )}
    </div>
  );
};
