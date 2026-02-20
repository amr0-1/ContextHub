import { useState } from 'react';
import { useConversation } from '../../context/ConversationContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { dispatch } = useConversation();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        {!collapsed && (
          <div className={styles.brand}>
            <span className={styles.logo}>✦</span>
            <span className={styles.brandName}>Nexus AI</span>
          </div>
        )}
        <button
          className={styles.toggleBtn}
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▸' : '◂'}
        </button>
      </div>

      {/* New chat */}
      <button
        className={styles.newChatBtn}
        onClick={() => dispatch({ type: 'CLEAR' })}
      >
        {collapsed ? '+' : '+ New Chat'}
      </button>

      {/* Conversation list placeholder */}
      {!collapsed && (
        <nav className={styles.nav}>
          <div className={styles.sectionLabel}>Recent</div>
          <div className={styles.placeholder}>
            No conversation history yet.
          </div>
        </nav>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className={styles.footer}>
          <span className={styles.version}>v0.1.0</span>
        </div>
      )}
    </aside>
  );
}
