import { ConversationProvider } from './context/ConversationContext';
import Sidebar from './components/Sidebar/Sidebar';
import ContextMeter from './components/ContextMeter/ContextMeter';
import MessageList from './components/Chat/MessageList';
import MessageInput from './components/Chat/MessageInput';
import { useChat } from './hooks/useChat';
import styles from './App.module.css';

function ChatArea() {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <main className={styles.main}>
      <ContextMeter />
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </main>
  );
}

export default function App() {
  return (
    <ConversationProvider>
      <div className={styles.shell}>
        <Sidebar />
        <ChatArea />
      </div>
    </ConversationProvider>
  );
}
