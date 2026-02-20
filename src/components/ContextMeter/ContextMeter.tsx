import { useTokens } from '../../hooks/useTokens';
import { formatNumber, formatPercent } from '../../utils/formatting';
import styles from './ContextMeter.module.css';

export default function ContextMeter() {
  const { usedTokens, remainingTokens, usagePercent, contextLimit } = useTokens();

  const severity =
    usagePercent >= 0.9 ? 'critical' : usagePercent >= 0.7 ? 'warning' : 'healthy';

  return (
    <div className={styles.meter}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Used</span>
          <span className={`${styles.value} ${styles[severity]}`}>
            {formatNumber(usedTokens)}
          </span>
        </div>

        <div className={styles.stat}>
          <span className={styles.label}>Remaining</span>
          <span className={styles.value}>{formatNumber(remainingTokens)}</span>
        </div>

        <div className={styles.stat}>
          <span className={styles.label}>Limit</span>
          <span className={styles.value}>{formatNumber(contextLimit)}</span>
        </div>
      </div>

      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${styles[severity]}`}
          style={{ width: `${Math.min(usagePercent * 100, 100)}%` }}
        />
      </div>

      <span className={`${styles.percent} ${styles[severity]}`}>
        {formatPercent(usagePercent)}
      </span>
    </div>
  );
}
