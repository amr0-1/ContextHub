import { useTokens } from '../../hooks/useTokens';
import { formatNumber, formatPercent } from '../../utils/formatting';
import styles from './ContextMeter.module.css';

export default function ContextMeter() {
  const { usedTokens, remainingTokens, usagePercent, contextLimit, level } = useTokens();

  return (
    <div className={styles.meter}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Used</span>
          <span className={`${styles.value} ${styles[level]}`}>
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
          className={`${styles.barFill} ${styles[level]}`}
          style={{ width: `${Math.min(usagePercent * 100, 100)}%` }}
        />
      </div>

      <span className={`${styles.percent} ${styles[level]}`}>
        {formatPercent(usagePercent)}
      </span>
    </div>
  );
}
