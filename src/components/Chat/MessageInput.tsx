import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { useConversation } from '../../context/ConversationContext';
import { countMessageTokens } from '../../services/token_engine';
import { formatNumber } from '../../utils/formatting';
import styles from './MessageInput.module.css';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [draftTokens, setDraftTokens] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { models } = useConversation();

  // Debounced live token counting (150ms)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setDraftTokens(0);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDraftTokens(countMessageTokens(value, models.active.tokenizer));
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [value, models.active.tokenizer]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setDraftTokens(0);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message ContextHub AI…"
          rows={1}
          disabled={disabled}
        />

        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>

      <div className={styles.toolbar}>
        {draftTokens > 0 && (
          <span className={styles.liveCounter}>
            ~{formatNumber(draftTokens)} tokens
          </span>
        )}
        <span className={styles.hint}>
          <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
