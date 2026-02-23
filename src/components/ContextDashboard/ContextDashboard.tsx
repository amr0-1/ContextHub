import { useState } from 'react';
import { useConversation } from '../../context/ConversationContext';
import { useTokens } from '../../hooks/useTokens';
import { formatNumber } from '../../utils/formatting';
import { truncate } from '../../utils/formatting';
import styles from './ContextDashboard.module.css';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Estimate cost in USD from token counts + model pricing (per-1M rates). */
function estimateCost(
  inputTokens: number,
  outputTokens: number,
  inputRate: number,
  outputRate: number,
): string {
  const cost =
    (inputTokens / 1_000_000) * inputRate +
    (outputTokens / 1_000_000) * outputRate;
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(4)}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContextDashboard() {
  const [detailOpen, setDetailOpen] = useState(false);
  const { state, models } = useConversation();
  const {
    usedTokens,
    remainingTokens,
    percent,
    level,
    contextLimit,
    totalInputTokens,
    totalOutputTokens,
  } = useTokens();

  const { active: model } = models;
  const { messages } = state.conversation;

  // Largest token count among messages — used for relative bar widths
  const maxMsgTokens = messages.reduce(
    (max, m) => Math.max(max, m.tokenCount ?? 0),
    0,
  );

  return (
    <section className={styles.dashboard} aria-label="Context window status">
      {/* ── Header row ─────────────────────────────── */}
      <div className={styles.header}>
        {/* Model badge */}
        <div className={styles.modelBadge}>
          <span className={styles.modelDot} />
          <span className={styles.modelName}>{model.name}</span>
          <span className={styles.providerTag}>{model.provider}</span>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Used</span>
            <span className={`${styles.statValue} ${styles[level]}`}>
              {formatNumber(usedTokens)}
            </span>
          </div>

          <div className={styles.stat}>
            <span className={styles.statLabel}>Remaining</span>
            <span className={styles.statValue}>
              {formatNumber(remainingTokens)}
            </span>
          </div>

          <div className={styles.stat}>
            <span className={styles.statLabel}>Limit</span>
            <span className={styles.statValue}>
              {formatNumber(contextLimit)}
            </span>
          </div>

          <div className={styles.stat}>
            <span className={styles.statLabel}>Est. Cost</span>
            <span className={`${styles.statValue} ${styles.costValue}`}>
              {estimateCost(
                totalInputTokens,
                totalOutputTokens,
                model.pricing.input,
                model.pricing.output,
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────── */}
      <div className={styles.barSection}>
        <span className={`${styles.levelBadge} ${styles[level]}`}>
          {level}
        </span>

        <div className={styles.barTrack}>
          <div
            className={`${styles.barFill} ${styles[level]}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        <span className={`${styles.percentBadge} ${styles[level]}`}>
          {percent.toFixed(1)}%
        </span>

        <button
          className={styles.toggleBtn}
          onClick={() => setDetailOpen((o) => !o)}
          aria-expanded={detailOpen}
          aria-controls="ctx-detail-panel"
        >
          {detailOpen ? '▴ Hide' : '▾ Details'}
        </button>
      </div>

      {/* ── Expandable detail panel ────────────────── */}
      {detailOpen && (
        <div
          id="ctx-detail-panel"
          className={styles.detailPanel}
          role="region"
          aria-label="Message-level token breakdown"
        >
          {messages.length === 0 ? (
            <div className={styles.emptyDetail}>
              No messages yet — send one to see the breakdown.
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className={styles.detailHeader}>
                <span style={{ width: '1.5rem' }}>#</span>
                <span style={{ width: '4.5rem' }}>Role</span>
                <span style={{ flex: 1 }}>Preview</span>
                <span style={{ minWidth: '3rem', textAlign: 'right' }}>
                  Tokens
                </span>
                <span style={{ width: '4rem' }} />
              </div>

              {/* Message rows */}
              {messages.map((msg, i) => {
                const tokens = msg.tokenCount ?? 0;
                const barWidth =
                  maxMsgTokens > 0 ? (tokens / maxMsgTokens) * 100 : 0;

                return (
                  <div key={msg.id} className={styles.msgRow}>
                    <span className={styles.msgIndex}>{i + 1}</span>
                    <span
                      className={`${styles.msgRole} ${styles[msg.role]}`}
                    >
                      {msg.role}
                    </span>
                    <span className={styles.msgPreview}>
                      {truncate(msg.content, 60)}
                    </span>
                    <span className={styles.msgTokens}>
                      {formatNumber(tokens)}
                    </span>
                    <div className={styles.msgBar}>
                      <div
                        className={styles.msgBarFill}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Footer totals */}
              <div className={styles.detailFooter}>
                <span>
                  Input: <strong>{formatNumber(totalInputTokens)}</strong>
                </span>
                <span>
                  Output: <strong>{formatNumber(totalOutputTokens)}</strong>
                </span>
                <span>
                  Messages: <strong>{messages.length}</strong>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
