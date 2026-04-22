import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { Button } from '../common/Button';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'agent_stream';
  content: string;
  timestamp?: string;
}

interface ChatPanelProps {
  agentName?: string;
  agentOccupation?: string;
  messages: Message[];
  onSend: (content: string) => void;
  sending?: boolean;
}

export function ChatPanel({ 
  agentName, 
  agentOccupation, 
  messages, 
  onSend, 
  sending 
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input.trim());
    setInput('');
  };

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-primary)',
  };

  const headerStyles: CSSProperties = {
    padding: 'var(--space-md)',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-secondary)',
  };

  const messagesStyles: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  };

  const inputAreaStyles: CSSProperties = {
    padding: 'var(--space-md)',
    borderTop: '1px solid var(--border-subtle)',
    background: 'var(--bg-secondary)',
  };

  const messageBubbleStyles = (isUser: boolean): CSSProperties => ({
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '75%',
    padding: 'var(--space-md)',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: isUser ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: isUser ? '#fff' : 'var(--text-primary)',
    fontSize: 'var(--text-base)',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    position: 'relative',
  });

  if (!agentName) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: 'var(--space-xl)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>💬</div>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          选择角色开始对话
        </div>
        <div style={{ fontSize: 'var(--text-sm)', maxWidth: '300px' }}>
          点击左侧的角色列表，选择你想对话的 AI 角色
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>
          {agentName}
        </div>
        {agentOccupation && (
          <div style={{ 
            fontSize: 'var(--text-sm)', 
            color: 'var(--text-secondary)',
            marginTop: '2px',
          }}>
            {agentOccupation}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={messagesStyles}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: 'var(--space-xl)',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>👋</div>
            <div>向 {agentName} 打个招呼吧</div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isStreaming = msg.role === 'agent_stream';
          const prevMsg = messages[index - 1];
          const showAvatar = !isUser && (index === 0 || prevMsg?.role === 'user');

          return (
            <div
              key={msg.id || index}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 'var(--space-sm)',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}
            >
              {showAvatar && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  flexShrink: 0,
                  marginBottom: 'var(--space-xs)',
                }}>
                  {agentName.charAt(0)}
                </div>
              )}
              {!showAvatar && !isUser && <div style={{ width: 32, flexShrink: 0 }} />}
              
              <div style={messageBubbleStyles(isUser)}>
                {msg.content}
                {isStreaming && msg.content && (
                  <span style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    background: 'currentColor',
                    marginLeft: '2px',
                    animation: 'blink 1s infinite',
                  }}>
                    ▊
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
            }}>
              {agentName?.charAt(0)}
            </div>
            <div style={{
              padding: 'var(--space-md)',
              borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}>
              <span style={{ display: 'flex', gap: '4px' }}>
                <span style={{ animation: 'bounce 1s infinite 0s' }}>.</span>
                <span style={{ animation: 'bounce 1s infinite 0.2s' }}>.</span>
                <span style={{ animation: 'bounce 1s infinite 0.4s' }}>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={inputAreaStyles}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`给 ${agentName} 发消息...`}
            disabled={sending}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontSize: 'var(--text-base)',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            size="md"
          >
            发送
          </Button>
        </div>
      </form>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
