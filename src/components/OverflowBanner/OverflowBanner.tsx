import { useState } from 'react';
import { useOverflow } from '../../hooks/useOverflow';
import { formatNumber } from '../../utils/formatting';
import styles from './OverflowBanner.module.css';

export default function OverflowBanner() {
  const {
    showWarning,
    isBlocked,
    largerModels,
    summarize,
    trim,
    switchModel,
    exportAndClear,
  } = useOverflow();

  const [dismissed, setDismissed] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');

  // Always reset dismiss state when escalating to block
  if (isBlocked && dismissed) {
    setDismissed(false);
  }

  if (!showWarning || (dismissed && !isBlocked)) return null;

  const bannerLevel = isBlocked ? 'block' : 'critical';

  const handleSwitchModel = () => {
    const targetId = selectedModel || largerModels[0]?.id;
    if (targetId) switchModel(targetId);
  };

  return (
    <div
      className={`${styles.banner} ${styles[bannerLevel]}`}
      role="alert"
      aria-live="assertive"
    >
      <span className={styles.icon}>
        {isBlocked ? '🚫' : '⚠️'}
      </span>

      <div className={styles.textBlock}>
        <div className={styles.title}>
          {isBlocked
            ? 'Context window full — sending blocked'
            : 'Context window running low'}
        </div>
        <div className={styles.subtitle}>
          {isBlocked
            ? 'Choose an action below to free up space before continuing.'
            : 'Consider freeing space to avoid hitting the limit.'}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${styles.primary}`}
          onClick={summarize}
          title="Summarize the conversation to free up tokens"
        >
          ✦ Summarize
        </button>

        <button
          className={styles.actionBtn}
          onClick={() => trim(3)}
          title="Remove the 3 oldest message pairs"
        >
          ✂ Trim oldest
        </button>

        {largerModels.length > 0 && (
          <div className={styles.modelPicker}>
            <select
              className={styles.modelSelect}
              value={selectedModel || largerModels[0].id}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Select a larger model"
            >
              {largerModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({formatNumber(m.contextWindow)})
                </option>
              ))}
            </select>
            <button
              className={styles.actionBtn}
              onClick={handleSwitchModel}
              title="Switch to a model with a larger context window"
            >
              ↗ Switch
            </button>
          </div>
        )}

        <button
          className={styles.actionBtn}
          onClick={exportAndClear}
          title="Download conversation as JSON and start fresh"
        >
          ↓ Export &amp; new
        </button>
      </div>

      {!isBlocked && (
        <button
          className={styles.dismissBtn}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warning"
        >
          ✕
        </button>
      )}
    </div>
  );
}
