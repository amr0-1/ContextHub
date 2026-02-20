import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { useConversation } from '../../context/ConversationContext';
import { AVAILABLE_MODELS } from '../../types/models';
import type { Model } from '../../types/models';
import styles from './MessageInput.module.css';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { state, dispatch } = useConversation();

  const currentModel = state.conversation.model;

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

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === e.target.value) as Model;
    dispatch({ type: 'SET_MODEL', payload: model });
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
          placeholder="Message Nexus AI…"
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
        <select
          className={styles.modelSelect}
          value={currentModel.id}
          onChange={handleModelChange}
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.provider}
            </option>
          ))}
        </select>

        <span className={styles.hint}>
          <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
