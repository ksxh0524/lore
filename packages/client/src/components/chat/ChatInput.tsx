import type { FormEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('msg') as HTMLInputElement;
    const content = input.value.trim();
    if (!content) return;
    input.value = '';
    onSend(content);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '1rem', borderTop: '1px solid #1a1a25', display: 'flex', gap: '0.5rem', background: '#12121a' }}>
      <input name="msg" placeholder="输入消息..." disabled={disabled} style={{
        flex: 1, padding: '0.75rem', borderRadius: '8px',
        background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', outline: 'none',
      }} />
      <button type="submit" disabled={disabled} style={{
        padding: '0.75rem 1.5rem', borderRadius: '8px',
        background: disabled ? '#333' : '#6366f1', color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      }}>发送</button>
    </form>
  );
}
