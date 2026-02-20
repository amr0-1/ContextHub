import { useConversation } from '../../context/ConversationContext';
import { formatNumber } from '../../utils/formatting';
import styles from './ModelSelector.module.css';

export default function ModelSelector() {
  const { models, dispatch } = useConversation();
  const { active, all } = models;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'SET_MODEL', payload: e.target.value });
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="model-select">
        Model
      </label>
      
      <div className={styles.selectWrapper}>
        <select
          id="model-select"
          value={active.id}
          onChange={handleChange}
          className={styles.select}
        >
          {all.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <span className={styles.icon}>▼</span>
      </div>

      <div className={styles.modelInfo}>
        <span className={styles.providerBadge}>{active.provider}</span>
        <span>{formatNumber(active.contextWindow)} tokens</span>
      </div>
    </div>
  );
}
