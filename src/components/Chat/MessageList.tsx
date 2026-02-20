import { useEffect, useRef } from 'react';
import type { Message } from '../../types/messages';
import { formatTime } from '../../utils/formatting';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={styles.empty}>
        <img
          className={styles.emptyLogo}
          src="/logo.png"
          alt="ContextHub AI logo"
        />
        <h2 className={styles.emptyTitle}>ContextHub AI</h2>
        <p className={styles.emptySubtitle}>
          Start a conversation — your context window usage is tracked in real time.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`${styles.bubble} ${styles[msg.role]}`}
        >
          <div className={styles.avatar}>
            {msg.role === 'user' ? 'U' : '✦'}
          </div>

          <div className={styles.body}>
            <div className={styles.meta}>
              <span className={styles.role}>
                {msg.role === 'user' ? 'You' : 'ContextHub AI'}
              </span>
              <span className={styles.time}>{formatTime(msg.timestamp)}</span>
              <span className={styles.tokens}>{msg.tokenCount ?? 0} tokens</span>
            </div>
            <div className={styles.content}>{msg.content}</div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className={`${styles.bubble} ${styles.assistant}`}>
          <div className={styles.avatar}>✦</div>
          <div className={styles.body}>
            <div className={styles.meta}>
              <span className={styles.role}>ContextHub AI</span>
            </div>
            <div className={styles.typing}>
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
