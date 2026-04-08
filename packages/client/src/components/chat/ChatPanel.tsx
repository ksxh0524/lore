import { ChatInput } from './ChatInput';

interface Message {
  role: 'user' | 'agent';
  content: string;
}

interface ChatPanelProps {
  agentName: string;
  agentOccupation: string;
  messages: Message[];
  onSend: (content: string) => void;
  sending?: boolean;
}

export function ChatPanel({ agentName, agentOccupation, messages, onSend, sending }: ChatPanelProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #1a1a25', background: '#12121a' }}>
        <span style={{ fontWeight: 'bold' }}>{agentName}</span>
        <span style={{ color: '#8888a0', marginLeft: '0.5rem' }}>{agentOccupation}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 && (
          <div style={{ color: '#555570', textAlign: 'center', marginTop: '2rem' }}>
            向 {agentName} 发一条消息开始对话
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
            <div style={{
              padding: '0.75rem 1rem', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user' ? '#6366f1' : '#1a1a25', color: '#f0f0f5',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '70%' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '12px 12px 12px 4px', background: '#1a1a25', color: '#8888a0' }}>
              正在输入...
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={onSend} disabled={sending} />
    </div>
  );
}
