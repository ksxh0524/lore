import { useState, useRef, useEffect } from 'react';
import { MessageSquare, HandMetal } from 'lucide-react';
import { Button } from '../common/Button';
import './chat-panel.css';

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
  sending,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input.trim());
    setInput('');
  };

  if (!agentName) {
    return (
      <div className="chat-empty">
        <MessageSquare className="chat-empty-icon" />
        <div className="chat-empty-title">选择角色开始对话</div>
        <div className="chat-empty-subtitle">点击左侧的角色列表，选择你想对话的 AI 角色</div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-name">{agentName}</div>
        {agentOccupation && (
          <div className="chat-header-occupation">{agentOccupation}</div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <HandMetal className="chat-welcome-icon" />
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
              className={`chat-message-wrapper ${isUser ? 'user' : 'agent'}`}
            >
              {showAvatar && (
                <div className="chat-avatar">{agentName.charAt(0)}</div>
              )}
              {!showAvatar && !isUser && <div className="chat-avatar-spacer" />}
              <div className={`chat-bubble ${isUser ? 'user' : 'agent'}`}>
                {msg.content}
                {isStreaming && msg.content && (
                  <span className="chat-cursor">▊</span>
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="chat-typing">
            <div className="chat-avatar">{agentName?.charAt(0)}</div>
            <div className="chat-typing-bubble">
              <span className="chat-typing-dots">
                <span className="chat-typing-dot">.</span>
                <span className="chat-typing-dot">.</span>
                <span className="chat-typing-dot">.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`给 ${agentName} 发消息...`}
            disabled={sending}
            className="chat-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={!input.trim() || sending} size="md">
            发送
          </Button>
        </div>
      </form>
    </div>
  );
}