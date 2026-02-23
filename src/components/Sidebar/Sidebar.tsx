import { useState } from 'react';
import { useConversation } from '../../context/ConversationContext';
import styles from './Sidebar.module.css';
import ModelSelector from '../ModelSelector/ModelSelector';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    state,
    newConversation,
    loadConversation,
    removeConversation,
  } = useConversation();

  const activeId = state.conversation.id;
  const conversations = state.conversationList;

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        {!collapsed && (
          <div className={styles.brand}>
            <img
              src="/logo.png"
              alt="ContextHub AI logo"
              className={styles.logoImg}
            />
            <span className={styles.brandName}>ContextHub AI</span>
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

      {/* Model Selector */}
      {!collapsed && <ModelSelector />}

      {/* New chat */}
      <button
        className={styles.newChatBtn}
        onClick={() => newConversation()}
      >
        {collapsed ? '+' : '+ New Chat'}
      </button>

      {/* Conversation list */}
      {!collapsed && (
        <nav className={styles.nav}>
          <div className={styles.sectionLabel}>Recent</div>
          {conversations.length === 0 ? (
            <div className={styles.placeholder}>
              No conversation history yet.
            </div>
          ) : (
            <ul className={styles.conversationList}>
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`${styles.conversationItem} ${
                    conv.id === activeId ? styles.active : ''
                  }`}
                >
                  <button
                    className={styles.conversationBtn}
                    onClick={() => loadConversation(conv.id)}
                    title={conv.title}
                  >
                    <span className={styles.conversationTitle}>
                      {conv.title}
                    </span>
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConversation(conv.id);
                    }}
                    aria-label="Delete conversation"
                    title="Delete"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
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
