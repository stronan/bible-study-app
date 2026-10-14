import React from "react";
import type { BibleVersion } from "../api";
import { isApiAvailable } from "../utils";

interface HeaderBarProps {
  version: string;
  versions: BibleVersion[];
  onVersionChange: (version: string) => void;
  contextSize: number;
  contextOptions: number[];
  onContextSizeChange: (size: number) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  version,
  versions,
  onVersionChange,
  contextSize,
  contextOptions,
  onContextSizeChange,
  apiKey,
  onApiKeyChange,
}) => {
  const [showApiKeyModal, setShowApiKeyModal] = React.useState(false);
  const [tempApiKey, setTempApiKey] = React.useState("");

  const handleApiKeySave = () => {
    onApiKeyChange(tempApiKey.trim());
    setShowApiKeyModal(false);
  };

  const handleApiKeyCancel = () => {
    setTempApiKey("");
    setShowApiKeyModal(false);
  };

  const apiConfigured = isApiAvailable() || apiKey.length > 0;

  return (
    <header className="header-bar">
      <h1 className="app-title">Bible Study App</h1>
      <div className="controls">
        <div className="control-group">
          <label htmlFor="version-select">Version:</label>
          <select
            id="version-select"
            value={version}
            onChange={(e) => onVersionChange(e.target.value)}
            className="version-select"
          >
            {versions.map((v) => (
              <option key={v.version_id} value={v.version_id}>
                {v.title} ({v.version_id})
              </option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="context-size">Context:</label>
          <select
            id="context-size"
            value={contextSize}
            onChange={(e) => onContextSizeChange(parseInt(e.target.value, 10))}
            className="context-select"
          >
            {contextOptions.map((size) => (
              <option key={size} value={size}>
                {size} verse{size !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <button
            className={`api-key-button ${apiConfigured ? "configured" : "unconfigured"}`}
            onClick={() => {
              setTempApiKey(apiKey);
              setShowApiKeyModal(true);
            }}
            aria-label="Configure API key"
          >
            {apiConfigured ? "🔒 API Key Set" : "🔓 Set API Key"}
          </button>
        </div>
      </div>

      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>IQ Bible API Key</h2>
            <p>
              Enter your IQ Bible API key. It is stored in localStorage only and
              never sent over the network except to the IQ Bible API.
            </p>
            <p>
              Get a free key at <a href="https://iqbible.com" target="_blank" rel="noopener noreferrer">iqbible.com</a>.
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="iqb_live_..."
              className="api-key-input"
            />
            <div className="modal-actions">
              <button onClick={handleApiKeyCancel}>Cancel</button>
              <button onClick={handleApiKeySave} className="primary-button">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
